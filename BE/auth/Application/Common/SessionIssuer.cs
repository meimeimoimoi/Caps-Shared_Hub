using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Sessions;
using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Common;

/// <summary>Issues the access token and stores the hashed refresh token in one place for every sign-in path.</summary>
public sealed class SessionIssuer(
    IUserProfileReader profiles,
    IAccessTokenIssuer accessTokens,
    IRefreshTokenRepository refreshTokens,
    AuthOptions options,
    TimeProvider clock
) : ISessionIssuer
{
    public async Task<SessionResult> IssueAsync(
        User user,
        CancellationToken ct,
        Guid? rotatedFrom = null,
        bool isNew = false
    )
    {
        var now = clock.GetUtcNow();
        var me = await profiles.DescribeAsync(user, ct, isNew);
        var access = accessTokens.Issue(user, me.Roles, me.Permissions);
        var raw = OpaqueTokens.NewSecret();
        var expiry = now.AddDays(options.RefreshDays);
        refreshTokens.Add(
            AuthRefreshToken.Issue(user.Id, OpaqueTokens.Hash(raw), now, expiry, rotatedFrom)
        );
        return new(new(access.Value, access.ExpiresInSeconds, me, isNew), raw, expiry);
    }

    public async Task RevokeAllAsync(User user, CancellationToken ct)
    {
        user.RevokeAllSessions();
        await refreshTokens.RevokeAllActiveAsync(user.Id, clock.GetUtcNow(), ct);
    }
}
