namespace Caps.Auth.Application.Abstractions.Security;

/// <summary>Result of a password check; SuccessRehashNeeded asks to store a stronger hash.</summary>
public enum PasswordCheck
{
    Failed,
    Success,
    SuccessRehashNeeded,
}

/// <summary>Hashes and verifies passwords; the algorithm (PBKDF2) stays in Infrastructure.</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    PasswordCheck Verify(string hash, string password);

    /// <summary>Spends the same time as a real check so unknown emails cannot be detected by timing.</summary>
    void VerifyAgainstDummy(string password);
}
