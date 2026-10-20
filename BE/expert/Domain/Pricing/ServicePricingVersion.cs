using Caps.Common.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// One Pricing Version of an approved Expert-Service (state model 5). Approved versions are never edited:
/// every change is a new version (BR-E18), so cases keep the price they were created with.
/// </summary>
public sealed class ServicePricingVersion
{
    private ServicePricingVersion() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid QualificationId { get; private set; }
    public Guid ExpertProfileId { get; private set; }
    public string ServiceCode { get; private set; } = default!;

    /// <summary>1, 2, 3… per qualification; shown as v1, v2…</summary>
    public int Sequence { get; private set; }

    /// <summary>Price in VND.</summary>
    public long Amount { get; private set; }
    public DateOnly EffectiveFrom { get; private set; }

    /// <summary>Last day in effect; set when a newer version replaces it.</summary>
    public DateOnly? EffectiveTo { get; private set; }
    public string? Reason { get; private set; }
    public string Status { get; private set; } = PricingStatus.Draft;

    /// <summary>Change from the price in effect at submission, in percent; null for the first price.</summary>
    public int? ChangePercent { get; private set; }
    public bool AutoApproved { get; private set; }

    /// <summary>System Admin who decided; null when auto-approved or not decided.</summary>
    public Guid? DecidedByUserId { get; private set; }
    public string? DecisionNote { get; private set; }
    public DateTimeOffset? SubmittedAt { get; private set; }
    public DateTimeOffset? DecidedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsEditable => PricingStatus.IsEditable(Status);

    /// <summary>Starts a draft for an approved service (BR-E15).</summary>
    public static ServicePricingVersion CreateDraft(
        ExpertServiceQualification qualification,
        int sequence,
        DateTimeOffset now
    )
    {
        if (qualification.Status != QualificationStatus.ApprovedForService)
            throw ExpertErrors.PricingNotAllowed(qualification.Status);
        return new ServicePricingVersion
        {
            QualificationId = qualification.Id,
            ExpertProfileId = qualification.ExpertProfileId,
            ServiceCode = qualification.ServiceCode,
            Sequence = sequence,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    /// <summary>Saves the expert's input; only while the version is editable.</summary>
    public PricingEvent Save(
        Guid actorUserId,
        long amount,
        DateOnly effectiveFrom,
        string? reason,
        PricingPolicy policy,
        DateTimeOffset now
    )
    {
        if (!IsEditable)
            throw ExpertErrors.PricingVersionLocked(Status);
        reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        PricingRules.Validate(
            amount,
            effectiveFrom,
            reason,
            false,
            policy,
            PricingRules.BusinessDate(now)
        );
        Amount = amount;
        EffectiveFrom = effectiveFrom;
        Reason = reason;
        if (Status == PricingStatus.ReturnForRevision)
            Status = PricingStatus.Draft;
        UpdatedAt = now;
        return PricingEvent.Record(this, PricingAction.Saved, actorUserId, null, now);
    }

    /// <summary>
    /// Submits the saved draft. The first price, or a change within the threshold from the price in effect,
    /// is approved by the system at once; a larger change waits for a System Admin (BR-E17).
    /// </summary>
    /// <param name="current">The approved version in effect, if any; superseded when this one is approved.</param>
    public IReadOnlyList<PricingEvent> Submit(
        Guid actorUserId,
        ServicePricingVersion? current,
        PricingPolicy policy,
        DateTimeOffset now
    )
    {
        if (!IsEditable)
            throw ExpertErrors.PricingVersionLocked(Status);
        PricingRules.Validate(
            Amount,
            EffectiveFrom,
            Reason,
            true,
            policy,
            PricingRules.BusinessDate(now)
        );
        ChangePercent = PricingRules.ChangePercent(Amount, current?.Amount);
        SubmittedAt = now;
        UpdatedAt = now;
        var events = new List<PricingEvent>
        {
            PricingEvent.Record(this, PricingAction.Submitted, actorUserId, null, now),
        };
        if (!PricingRules.AutoApproves(ChangePercent, policy))
        {
            Status = PricingStatus.PendingApproval;
            return events;
        }
        AutoApproved = true;
        events.AddRange(Approve(null, null, current, PricingAction.AutoApproved, now));
        return events;
    }

    /// <summary>A System Admin's decision on a change above the threshold; a note is required unless approving.</summary>
    public IReadOnlyList<PricingEvent> Decide(
        Guid adminUserId,
        string decision,
        string? note,
        ServicePricingVersion? current,
        DateTimeOffset now
    )
    {
        if (Status != PricingStatus.PendingApproval)
            throw ExpertErrors.PricingNotPending(Status);
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        switch (decision)
        {
            case PricingDecision.Approve:
                return Approve(adminUserId, note, current, PricingAction.Approved, now);
            case PricingDecision.ReturnForRevision:
            case PricingDecision.Reject:
                if (note == null)
                    throw ExpertErrors.PricingNoteRequired();
                var returned = decision == PricingDecision.ReturnForRevision;
                Status = returned ? PricingStatus.ReturnForRevision : PricingStatus.Rejected;
                DecidedByUserId = adminUserId;
                DecisionNote = note;
                DecidedAt = now;
                UpdatedAt = now;
                return
                [
                    PricingEvent.Record(
                        this,
                        returned ? PricingAction.Returned : PricingAction.Rejected,
                        adminUserId,
                        note,
                        now
                    ),
                ];
            default:
                throw ExpertErrors.InvalidPricingDecision();
        }
    }

    /// <summary>In effect on the given day: approved (or since superseded) and within its dates.</summary>
    public bool IsInEffect(DateOnly day) =>
        Status is PricingStatus.Approved or PricingStatus.Superseded
        && EffectiveFrom <= day
        && (EffectiveTo == null || EffectiveTo >= day);

    private List<PricingEvent> Approve(
        Guid? adminUserId,
        string? note,
        ServicePricingVersion? current,
        string action,
        DateTimeOffset now
    )
    {
        Status = PricingStatus.Approved;
        DecidedByUserId = adminUserId;
        DecisionNote = note;
        DecidedAt = now;
        UpdatedAt = now;
        var events = new List<PricingEvent>
        {
            PricingEvent.Record(this, action, adminUserId, note, now),
        };
        if (current != null && current.Id != Id)
            events.Add(current.SupersedeBy(this, now));
        return events;
    }

    // The previous price stays in effect until the day before the new one starts
    private PricingEvent SupersedeBy(ServicePricingVersion newer, DateTimeOffset now)
    {
        Status = PricingStatus.Superseded;
        EffectiveTo = newer.EffectiveFrom.AddDays(-1);
        UpdatedAt = now;
        return PricingEvent.Record(this, PricingAction.Superseded, null, null, now);
    }
}
