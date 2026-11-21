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
}
