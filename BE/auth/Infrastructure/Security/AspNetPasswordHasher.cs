using Caps.Auth.Domain.Users;
using Microsoft.AspNetCore.Identity;
using AppHasher = Caps.Auth.Application.Abstractions.Security.IPasswordHasher;
using PasswordCheck = Caps.Auth.Application.Abstractions.Security.PasswordCheck;

namespace Caps.Auth.Infrastructure.Security;

/// <summary>ASP.NET Core Identity's PBKDF2 hasher behind the application port.</summary>
public sealed class AspNetPasswordHasher : AppHasher
{
    private static readonly PasswordHasher<User> Inner = new();

    // The default PBKDF2 hasher ignores the user argument
    private static readonly User Nobody = null!;
    private static readonly string DummyHash = Inner.HashPassword(
        Nobody,
        "Unused-account-timing-padding-42"
    );

    /// <summary>Length of a hex SHA-256 digest: hashes from the old demo scheme, which can never match.</summary>
    private const int LegacySha256Length = 64;

    public string Hash(string password) => Inner.HashPassword(Nobody, password);

    public PasswordCheck Verify(string hash, string password) =>
        hash.Length == LegacySha256Length
            ? PasswordCheck.Failed
            : Inner.VerifyHashedPassword(Nobody, hash, password) switch
            {
                PasswordVerificationResult.Success => PasswordCheck.Success,
                PasswordVerificationResult.SuccessRehashNeeded => PasswordCheck.SuccessRehashNeeded,
                _ => PasswordCheck.Failed,
            };

    public void VerifyAgainstDummy(string password) =>
        Inner.VerifyHashedPassword(Nobody, DummyHash, password);
}
