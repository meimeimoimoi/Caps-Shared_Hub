using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Abstractions;

/// <summary>The services experts sell and their prices.</summary>
public interface IServiceOfferingRepository
{
    /// <summary>The expert's offering for the service, tracked for changes.</summary>
    Task<ServiceOffering?> FindAsync(Guid profileId, string serviceCode, CancellationToken ct);

    /// <summary>Offerings of these experts, untracked.</summary>
    Task<IReadOnlyList<ServiceOffering>> ListAsync(
        IReadOnlyCollection<Guid> profileIds,
        CancellationToken ct
    );
    void Add(ServiceOffering offering);
}
