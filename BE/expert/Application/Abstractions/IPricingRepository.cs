using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Pricing Versions of approved services and their audit trail.</summary>
public interface IPricingRepository
{
    /// <summary>Every version of the qualification, newest first, untracked.</summary>
    Task<IReadOnlyList<ServicePricingVersion>> ListAsync(
        Guid qualificationId,
        CancellationToken ct
    );

    /// <summary>Every version of the profile's services, untracked (portal readiness).</summary>
    Task<IReadOnlyList<ServicePricingVersion>> ListByProfileAsync(
        Guid profileId,
        CancellationToken ct
    );

    /// <summary>Every version of the given qualifications, untracked (Marketplace prices).</summary>
    Task<IReadOnlyList<ServicePricingVersion>> ListByQualificationsAsync(
        IReadOnlyCollection<Guid> qualificationIds,
        CancellationToken ct
    );

    /// <summary>The undecided version (draft, returned or pending), tracked.</summary>
    Task<ServicePricingVersion?> FindOpenAsync(Guid qualificationId, CancellationToken ct);

    /// <summary>The latest APPROVED version, tracked: the reference for the change threshold.</summary>
    Task<ServicePricingVersion?> FindLatestApprovedAsync(
        Guid qualificationId,
        CancellationToken ct
    );

    Task<ServicePricingVersion?> FindAsync(Guid versionId, CancellationToken ct);
    Task<int> MaxSequenceAsync(Guid qualificationId, CancellationToken ct);

    /// <summary>Account id of the expert who owns the version, without tracking anything.</summary>
    Task<Guid?> FindExpertUserIdAsync(Guid versionId, CancellationToken ct);

    /// <summary>Versions in the given status, oldest submission first (approval queue).</summary>
    Task<IReadOnlyList<ServicePricingVersion>> ListByStatusAsync(
        string status,
        CancellationToken ct
    );

    /// <summary>The service's pricing history, oldest first.</summary>
    Task<IReadOnlyList<PricingEvent>> ListEventsAsync(Guid qualificationId, CancellationToken ct);

    /// <summary>Number of recorded events: the workspace revision used to detect concurrent edits.</summary>
    Task<int> CountEventsAsync(Guid qualificationId, CancellationToken ct);

    void Add(ServicePricingVersion version);
    void AddEvents(IEnumerable<PricingEvent> events);
}
