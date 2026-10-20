namespace Caps.Common.Security;

/// <summary>
/// Token validation settings, bound from the "Jwt" section. Services only hold public keys:
/// the private signing key never leaves the auth service.
/// </summary>
public sealed class JwtOptions
{
    public string Issuer { get; set; } = "caps-auth";
    public string Audience { get; set; } = "caps-api";

    /// <summary>Auth's public key set, e.g. http://localhost:5194/.well-known/jwks.json.</summary>
    public string? JwksUrl { get; set; }

    /// <summary>
    /// Fallback public keys (PEM) used when the JWKS cannot be downloaded, e.g. a service starting while
    /// auth is down. Public keys are not secret.
    /// </summary>
    public string[] PublicKeys { get; set; } = [];

    /// <summary>How often the JWKS is downloaded again; an unknown key id also triggers a refresh.</summary>
    public int JwksRefreshMinutes { get; set; } = 10;

    /// <summary>Defaults to true outside Development. Set false only for a trusted internal network.</summary>
    public bool? RequireHttpsMetadata { get; set; }
}
