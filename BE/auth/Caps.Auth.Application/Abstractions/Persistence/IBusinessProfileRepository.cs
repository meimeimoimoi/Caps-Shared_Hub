using Caps.Auth.Domain.Business;

namespace Caps.Auth.Application.Abstractions.Persistence;

public interface IBusinessProfileRepository
{
    Task<BusinessProfile?> GetAsync(Guid userId, CancellationToken ct);
    void Add(BusinessProfile profile);
}
