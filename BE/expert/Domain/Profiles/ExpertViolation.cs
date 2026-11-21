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
}
