namespace Caps.Auth.Application.Abstractions.Security;

/// <summary>Who a valid Google ID token belongs to.</summary>
public sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string? Name);

/// <summary>Checks a Google ID token (signature, issuer, audience, expiry); the OpenID Connect details stay in Infrastructure.</summary>
public interface IGoogleIdTokenValidator
{
    /// <summary>Throws INVALID_CREDENTIALS when the token is not a valid ID token for this app.</summary>
    Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct);
}
