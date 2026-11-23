namespace Caps.Expert.Application.Abstractions;

/// <summary>Read side of the admin dashboard: experts approved per month and experts serving now.</summary>
public interface IExpertStatsReader
{
    /// <summary>
    /// When each expert got their first final approval for any service, for experts whose first approval falls
    /// in [start, endBefore). A service reinstated after suspension does not count again.
    /// </summary>
    Task<IReadOnlyList<DateTimeOffset>> ListFirstApprovalsAsync(
        DateTimeOffset start,
        DateTimeOffset endBefore,
        CancellationToken ct
    );

    /// <summary>Experts with at least one service in APPROVED_FOR_SERVICE.</summary>
    Task<int> CountServingExpertsAsync(CancellationToken ct);

    /// <summary>Experts with a SUSPENDED service and no service still approved.</summary>
    Task<int> CountSuspendedExpertsAsync(CancellationToken ct);
}
