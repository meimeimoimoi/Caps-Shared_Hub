using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Checks shared by the expert's own service use cases.</summary>
public static class ExpertGuards
{
    /// <summary>The signed-in user's expert profile, which must be approved for service.</summary>
    public static async Task<ExpertProfile> GetApprovedAsync(
        this IExpertProfileRepository profiles,
        Guid userId,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(userId, ct);
        return profile is { IsApproved: true }
            ? profile
            : throw ExpertErrors.NotApprovedForService();
    }
}
