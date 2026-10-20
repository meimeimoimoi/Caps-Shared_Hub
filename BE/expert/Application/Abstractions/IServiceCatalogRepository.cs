using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Abstractions;

/// <summary>The services Shared Hub offers through experts.</summary>
public interface IServiceCatalogRepository
{
    /// <summary>Active services in display order.</summary>
    Task<IReadOnlyList<ServiceCatalogItem>> ListActiveAsync(CancellationToken ct);

    /// <summary>The service with this code, active or not.</summary>
    Task<ServiceCatalogItem?> FindAsync(string code, CancellationToken ct);
}
