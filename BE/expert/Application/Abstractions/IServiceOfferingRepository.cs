using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Abstractions;

/// <summary>The services experts sell, their prices and the price history.</summary>
public interface IServiceOfferingRepository
{
    /// <summary>The expert's offering for the service, tracked for changes.</summary>
    Task<ServiceOffering?> FindAsync(Guid profileId, string serviceCode, CancellationToken ct);

    /// <summary>Offerings of these experts, untracked.</summary>
    Task<IReadOnlyList<ServiceOffering>> ListAsync(
        IReadOnlyCollection<Guid> profileIds,
        CancellationToken ct
    );

    /// <summary>Saved prices of the expert's offering for the service, most recent first.</summary>
    Task<IReadOnlyList<ServiceOfferingChange>> ListChangesAsync(
        Guid profileId,
        string serviceCode,
        CancellationToken ct
    );

    void Add(ServiceOffering offering);

    void AddChange(ServiceOfferingChange change);
}
