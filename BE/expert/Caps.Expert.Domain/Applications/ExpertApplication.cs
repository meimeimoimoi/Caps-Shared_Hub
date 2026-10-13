using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Applications;

/// <summary>
/// One Expert Eligibility Application submission (Gate 1). Re-applying after NOT_ELIGIBLE/REJECTED
/// creates a new row linked to the previous one (BR-E23); past results are never overwritten.
/// Every status change returns the audit event to store with it.
/// </summary>
public sealed class ExpertApplication
{
    private ExpertApplication() { }

    public Guid Id { get; private set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; private set; } = default!;
    public string Status { get; private set; } = ExpertApplicationStatus.Draft;

    /// <summary>Latest submission (first submit or supplement); full history is in Events.</summary>
    public DateTimeOffset? SubmittedAt { get; private set; }
    public DateTimeOffset? DecidedAt { get; private set; }
    public string? DecisionNote { get; private set; }
    public Guid? PreviousApplicationId { get; private set; }
    public DateTimeOffset? EarliestReapplyAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public ICollection<ExpertEvidence> Evidences { get; private set; } = new List<ExpertEvidence>();
    public ICollection<ExpertApplicationEvent> Events { get; private set; } =
        new List<ExpertApplicationEvent>();

    public bool CanEdit => Status == ExpertApplicationStatus.Draft;
    public bool NeedsInformation => Status == ExpertApplicationStatus.NeedMoreInformation;
    public bool AcceptsFiles => CanEdit || NeedsInformation;

    /// <summary>Opens a new draft; refused while the previous result still blocks re-applying.</summary>
    public static (ExpertApplication Application, ExpertApplicationEvent Opened) Open(
        Guid profileId,
        ExpertApplication? previous,
        Guid actorUserId,
        DateTimeOffset now
    )
    {
        if (previous?.EarliestReapplyAt > now)
            throw ExpertErrors.ReapplyTooEarly(previous.EarliestReapplyAt.Value);
        var application = new ExpertApplication
        {
            ExpertProfileId = profileId,
            PreviousApplicationId = previous?.Id,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var opened = ExpertApplicationEvent.Record(
            application.Id,
            actorUserId,
            null,
            ExpertApplicationStatus.Draft,
            null,
            now
        );
        return (application, opened);
    }

    public void EnsureEditable()
    {
        if (!CanEdit)
            throw ExpertErrors.ApplicationLocked(Status);
    }

    /// <param name="supplement">Supplementary files are only accepted while more information is requested.</param>
    public void EnsureAcceptsFile(bool supplement)
    {
        if (!AcceptsFiles)
            throw ExpertErrors.ApplicationLocked(Status);
        if (supplement && !NeedsInformation)
            throw ExpertErrors.SupplementNotRequested();
    }

    /// <summary>Only files added after the latest submission (while supplementing) can be removed; submitted files are historical evidence.</summary>
    public bool CanRemove(ExpertEvidence evidence) =>
        CanEdit || (NeedsInformation && evidence.CreatedAt > SubmittedAt);

    public void Touch(DateTimeOffset now) => UpdatedAt = now;

    public ExpertApplicationEvent Submit(Guid actorUserId, DateTimeOffset now)
    {
        EnsureEditable();
        return MoveTo(ExpertApplicationStatus.Submitted, actorUserId, null, now);
    }

    /// <summary>BR-E05: after supplementing, return to the pending step (Gate 1 after submission).</summary>
    public ExpertApplicationEvent Resubmit(Guid actorUserId, string? note, DateTimeOffset now)
    {
        if (!NeedsInformation)
            throw ExpertErrors.ApplicationLocked(Status);
        return MoveTo(ExpertApplicationStatus.Submitted, actorUserId, note, now);
    }

    private ExpertApplicationEvent MoveTo(
        string status,
        Guid actorUserId,
        string? note,
        DateTimeOffset now
    )
    {
        var recorded = ExpertApplicationEvent.Record(Id, actorUserId, Status, status, note, now);
        Status = status;
        SubmittedAt = now;
        UpdatedAt = now;
        return recorded;
    }
}
