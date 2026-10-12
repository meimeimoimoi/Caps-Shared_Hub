using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Common;

public static class AccountGuards
{
    /// <summary>One generic error for every credential/token failure, so nothing leaks to attackers.</summary>
    public static AuthFailure Invalid() =>
        new(401, "INVALID_CREDENTIALS", "Invalid credentials or token.");

    /// <summary>Accounts that may still sign in (active or waiting for email verification).</summary>
    public static void EnsureEligible(User user)
    {
        if (user.Status != UserStatus.Active && user.Status != UserStatus.PendingVerification)
            throw Invalid();
    }

    public static void EnsureActive(User user)
    {
        if (user.Status != UserStatus.Active)
            throw new AuthFailure(
                403,
                "ACCOUNT_NOT_ACTIVE",
                "Email verification and active account required."
            );
    }

    public static async Task<User> GetAsync(
        this IUserRepository users,
        Guid id,
        CancellationToken ct
    ) => await users.FindAsync(id, ct) ?? throw Invalid();

    public static async Task<User> GetLockedAsync(
        this IUserRepository users,
        Guid id,
        CancellationToken ct
    ) => await users.LockAsync(id, ct) ?? throw Invalid();
}
