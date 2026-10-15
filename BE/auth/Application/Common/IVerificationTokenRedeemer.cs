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
