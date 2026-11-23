using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Profile;

/// <summary>Reads the signed-in user's own profile.</summary>
public sealed record GetMeQuery(Guid UserId);

/// <summary>Returns the signed-in user's profile with current roles and permissions.</summary>
public sealed class GetMeHandler(IUserRepository users, IUserProfileReader profiles)
    : IQueryHandler<GetMeQuery, MeResponse>
{
    public async Task<MeResponse> HandleAsync(GetMeQuery query, CancellationToken ct) =>
        await profiles.DescribeAsync(await users.GetAsync(query.UserId, ct), ct);
}
