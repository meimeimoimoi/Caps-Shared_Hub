using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Per-requirement results of Gate 1 decisions.</summary>
public interface IEligibilityCheckRepository
{
    /// <summary>Results of the most recent decision on the application, in EV order; empty before any decision.</summary>
    Task<IReadOnlyList<EligibilityCheck>> ListLatestAsync(Guid applicationId, CancellationToken ct);
    void AddRange(IEnumerable<EligibilityCheck> checks);
}
