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
}
