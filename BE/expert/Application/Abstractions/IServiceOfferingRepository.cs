using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Abstractions;

/// <summary>The service packages experts sell.</summary>
public interface IServiceOfferingRepository
{
    Task<ServiceOffering?> FindActiveAsync(
        Guid profileId,
        string serviceType,
        CancellationToken ct
    );
    Task<IReadOnlyList<ServiceOffering>> ListActiveAsync(Guid profileId, CancellationToken ct);
    void Add(ServiceOffering offering);
}
