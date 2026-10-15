using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Expert profiles, one per account.</summary>
public interface IExpertProfileRepository
{
    Task<ExpertProfile?> FindByUserAsync(Guid userId, CancellationToken ct);
    void Add(ExpertProfile profile);
}
