using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;

namespace Caps.Auth.Application.Common;

/// <summary>Account checks shared by several use cases, failing with the API's generic errors.</summary>
public static class AccountGuards
{
    public static void EnsureActive(User user)
    {
        if (!user.IsActive)
            throw CommonErrors.AccountNotActive();
    }

    /// <summary>Unknown ids fail like bad credentials, so nothing leaks to attackers.</summary>
    public static async Task<User> GetAsync(
        this IUserRepository users,
        Guid id,
        CancellationToken ct
    ) => await users.FindAsync(id, ct) ?? throw AuthErrors.InvalidCredentials();

    public static async Task<User> GetLockedAsync(
        this IUserRepository users,
        Guid id,
        CancellationToken ct
    ) => await users.LockAsync(id, ct) ?? throw AuthErrors.InvalidCredentials();
}
