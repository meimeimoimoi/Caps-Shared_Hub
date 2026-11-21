namespace Caps.Expert.Domain.Profiles;

/// <summary>Violation points of an expert (2026-11-20): counted over a rolling window, never reset.</summary>
public static class ViolationRules
{
    public const int WindowDays = 90;
    public const int HideAt = 6;
    public const int SuspendAt = 9;
    public const int MaxExcuses = 2;
    public const int MaxExcuseFiles = 5;

    /// <summary>The expert asks for an excuse within this many days of the violation.</summary>
    public const int RequestWithinDays = 2;

    /// <summary>LATE 1, WITHDREW 2, NO_DELIVERY 3 (workflow's ExpertViolationRecordedEvent kinds).</summary>
    public static short PointsOf(string kind) =>
        kind switch
        {
            "LATE" => 1,
            "WITHDREW" => 2,
            "NO_DELIVERY" => 3,
            _ => throw new ArgumentOutOfRangeException(
                nameof(kind),
                kind,
                "Unknown violation kind"
            ),
        };
}
