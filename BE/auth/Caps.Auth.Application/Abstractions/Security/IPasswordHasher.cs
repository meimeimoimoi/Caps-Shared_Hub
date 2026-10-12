namespace Caps.Auth.Application.Abstractions.Security;

public enum PasswordCheck
{
    Failed,
    Success,
    SuccessRehashNeeded,
}

public interface IPasswordHasher
{
    string Hash(string password);
    PasswordCheck Verify(string hash, string password);

    /// <summary>Spends the same time as a real check so unknown emails cannot be detected by timing.</summary>
    void VerifyAgainstDummy(string password);
}
