using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>The expert service's current price for a service, read when a client requests a review.</summary>
public interface IExpertOfferings
{
    /// <summary>
    /// The active offering of the expert for the service with the current platform fee,
    /// or null when the expert does not sell it (not approved, suspended or not priced).
    /// </summary>
    Task<ReviewOffer?> FindAsync(Guid expertProfileId, string serviceCode, CancellationToken ct);
}
