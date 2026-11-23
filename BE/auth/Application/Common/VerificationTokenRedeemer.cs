using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;

namespace Caps.Auth.Application.Common;

/// <summary>Looks the token up by hash and locks its account before the caller uses it.</summary>
public sealed class VerificationTokenRedeemer(
    IVerificationTokenRepository tokens,
    IUserRepository users,
    TimeProvider clock
) : IVerificationTokenRedeemer
{
    public async Task<(User User, VerificationToken Token)> FindUsableAsync(
        string rawToken,
        string purpose,
        CancellationToken ct
    )
    {
        var found =
            await tokens.FindByHashAsync(OpaqueTokens.Hash(rawToken), purpose, ct)
            ?? throw AuthErrors.InvalidCredentials();
        var user = await users.GetLockedAsync(found.UserId, ct);
        var token = await tokens.GetAsync(found.Id, ct);
        if (!token.IsUsable(clock.GetUtcNow()))
            throw AuthErrors.InvalidCredentials();
        return (user, token);
    }
}
