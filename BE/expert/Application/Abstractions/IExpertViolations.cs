using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Violation points of experts, kept one row per review case.</summary>
public interface IExpertViolations
{
    /// <summary>Saves the violation at once; false when the case was already counted.</summary>
    Task<bool> AddAsync(ExpertViolation violation, CancellationToken ct);

    /// <summary>Points of each profile that are not excused and happened after <paramref name="since"/>.</summary>
    Task<IReadOnlyDictionary<Guid, int>> PointsAsync(
        IReadOnlyCollection<Guid> profileIds,
        DateTimeOffset since,
        CancellationToken ct
    );

    /// <summary>Every violation of the expert, newest first.</summary>
    Task<IReadOnlyList<ExpertViolation>> ListAsync(Guid profileId, CancellationToken ct);

    /// <summary>The violation, tracked for changes; null when it is not this expert's.</summary>
    Task<ExpertViolation?> FindAsync(Guid profileId, Guid reviewCaseId, CancellationToken ct);

    /// <summary>How many of the expert's violations were excused after <paramref name="since"/>.</summary>
    Task<int> CountExcusedAsync(Guid profileId, DateTimeOffset since, CancellationToken ct);

    /// <summary>Excuse requests waiting for an admin, oldest first, with who asked.</summary>
    Task<IReadOnlyList<(ExpertViolation Violation, ExpertProfile Expert)>> ListPendingRequestsAsync(
        CancellationToken ct
    );
}
