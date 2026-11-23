namespace Caps.Expert.Domain.Profiles;

/// <summary>
/// One review case that counted against the expert. The key is the case, so a redelivered event counts once;
/// an excused row (force majeure) counts nothing.
/// </summary>
public sealed class ExpertViolation
{
    private ExpertViolation() { }

    public Guid ReviewCaseId { get; private set; }
    public Guid ExpertProfileId { get; private set; }
    public string Kind { get; private set; } = default!;
    public short Points { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset? ExcusedAt { get; private set; }
    public Guid? ExcusedBy { get; private set; }
    public string? ExcusedReason { get; private set; }

    /// <summary>The expert's own words when asking for an excuse; null when never asked.</summary>
    public string? ExcuseRequest { get; private set; }
    public DateTimeOffset? ExcuseRequestedAt { get; private set; }
    public DateTimeOffset? ExcuseDeclinedAt { get; private set; }

    /// <summary>Evidence uploaded with the excuse request.</summary>
    public List<ExcuseFile> ExcuseFiles { get; private set; } = [];

    /// <summary>Asked and the admin has neither excused nor declined yet.</summary>
    public bool ExcusePending =>
        ExcuseRequestedAt != null && ExcuseDeclinedAt == null && ExcusedAt == null;

    public static ExpertViolation Record(
        Guid reviewCaseId,
        Guid expertProfileId,
        string kind,
        DateTimeOffset occurredAt
    ) =>
        new()
        {
            ReviewCaseId = reviewCaseId,
            ExpertProfileId = expertProfileId,
            Kind = kind,
            Points = ViolationRules.PointsOf(kind),
            OccurredAt = occurredAt,
        };

    /// <summary>
    /// A System Admin excuses the violation for force majeure (2026-11-20): it stops counting, the money split
    /// does not change. Reason required; at most ViolationRules.MaxExcuses per expert in the window.
    /// </summary>
    /// <param name="excusedInWindow">Violations of this expert already excused within the window.</param>
    public void Excuse(Guid adminUserId, string? reason, int excusedInWindow, DateTimeOffset now)
    {
        if (ExcusedAt != null)
        {
            throw ExpertErrors.ViolationAlreadyExcused();
        }
        var why = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (why == null)
        {
            throw ExpertErrors.ViolationExcuseReasonRequired();
        }
        if (excusedInWindow >= ViolationRules.MaxExcuses)
        {
            throw ExpertErrors.ViolationExcuseLimit(
                ViolationRules.MaxExcuses,
                ViolationRules.WindowDays
            );
        }
        ExcusedAt = now;
        ExcusedBy = adminUserId;
        ExcusedReason = why;
    }

    /// <summary>
    /// The expert asks for a force-majeure excuse, once, within ViolationRules.RequestWithinDays of the violation,
    /// with up to ViolationRules.MaxExcuseFiles evidence files; the admin then excuses or declines.
    /// </summary>
    public void RequestExcuse(string? reason, IReadOnlyList<ExcuseFile> files, DateTimeOffset now)
    {
        if (ExcusedAt != null)
        {
            throw ExpertErrors.ViolationAlreadyExcused();
        }
        if (ExcuseRequestedAt != null)
        {
            throw ExpertErrors.ViolationExcuseAlreadyRequested();
        }
        if (now > OccurredAt.AddDays(ViolationRules.RequestWithinDays))
        {
            throw ExpertErrors.ViolationExcuseRequestClosed(ViolationRules.RequestWithinDays);
        }
        if (files.Count > ViolationRules.MaxExcuseFiles)
        {
            throw ExpertErrors.ViolationExcuseFileLimit(ViolationRules.MaxExcuseFiles);
        }
        var why = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        ExcuseRequest = why ?? throw ExpertErrors.ViolationExcuseReasonRequired();
        ExcuseFiles = [.. files];
        ExcuseRequestedAt = now;
    }

    /// <summary>The admin turns the request down; the violation keeps counting.</summary>
    public void DeclineExcuse(DateTimeOffset now)
    {
        if (!ExcusePending)
        {
            throw ExpertErrors.ViolationExcuseNotRequested();
        }
        ExcuseDeclinedAt = now;
    }
}
