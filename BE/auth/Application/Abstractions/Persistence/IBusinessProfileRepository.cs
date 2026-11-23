using Caps.Auth.Domain.Business;

namespace Caps.Auth.Application.Abstractions.Persistence;

/// <summary>Stores the company details attached to a customer account.</summary>
public interface IBusinessProfileRepository
{
    Task<BusinessProfile?> GetAsync(Guid userId, CancellationToken ct);
    void Add(BusinessProfile profile);
}
