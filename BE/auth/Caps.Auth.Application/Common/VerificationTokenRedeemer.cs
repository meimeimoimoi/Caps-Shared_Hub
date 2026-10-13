using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Auth.Domain.Verification;

namespace Caps.Auth.Application.Common;

/// <summary>Turns a raw emailed token into its account, failing generically when it is not usable.</summary>
public interface IVerificationTokenRedeemer
{
    /// <summary>
    /// Finds a usable email token and locks its user. Call inside a transaction;
    /// the caller marks the token used.
    /// </summary>
    Task<(User User, VerificationToken Token)> FindUsableAsync(
        string rawToken,
        string purpose,
        CancellationToken ct
    );
}

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
