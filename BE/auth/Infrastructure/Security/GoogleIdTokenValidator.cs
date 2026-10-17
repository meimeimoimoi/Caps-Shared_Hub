using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Domain;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Auth.Infrastructure.Security;

/// <summary>
/// Validates Google ID tokens against Google's OpenID Connect discovery document; the signing keys are
/// cached and refreshed by the configuration manager.
/// </summary>
public sealed class GoogleIdTokenValidator(
    AuthOptions options,
    ILogger<GoogleIdTokenValidator> logger
) : IGoogleIdTokenValidator
{
    private const string DiscoveryUrl =
        "https://accounts.google.com/.well-known/openid-configuration";
    private static readonly string[] Issuers =
    [
        "https://accounts.google.com",
        "accounts.google.com",
    ];

    private readonly ConfigurationManager<OpenIdConnectConfiguration> _discovery = new(
        DiscoveryUrl,
        new OpenIdConnectConfigurationRetriever(),
        new HttpDocumentRetriever()
    );
    private readonly JsonWebTokenHandler _handler = new();

    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(options.GoogleClientId))
            throw AuthErrors.GoogleLoginUnavailable();
        var result = await ValidateWithKeysAsync(idToken, ct);
        // Google rotates its keys; fetch them again once when the token names an unknown key
        if (result.Exception is SecurityTokenSignatureKeyNotFoundException)
        {
            _discovery.RequestRefresh();
            result = await ValidateWithKeysAsync(idToken, ct);
        }
        if (!result.IsValid)
            throw AuthErrors.InvalidCredentials();

        var subject = Claim(result, "sub");
        var email = Claim(result, "email");
        if (subject is null || email is null)
            throw AuthErrors.InvalidCredentials();
        var emailVerified = string.Equals(
            Claim(result, "email_verified"),
            "true",
            StringComparison.OrdinalIgnoreCase
        );
        return new(subject, email, emailVerified, Claim(result, "name"));
    }

    private async Task<TokenValidationResult> ValidateWithKeysAsync(
        string idToken,
        CancellationToken ct
    )
    {
        OpenIdConnectConfiguration discovery;
        try
        {
            discovery = await _discovery.GetConfigurationAsync(ct);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogWarning(e, "Could not download Google's signing keys.");
            throw AuthErrors.GoogleLoginUnavailable();
        }
        return await _handler.ValidateTokenAsync(
            idToken,
            new TokenValidationParameters
            {
                ValidIssuers = Issuers,
                ValidAudience = options.GoogleClientId,
                IssuerSigningKeys = discovery.SigningKeys,
                ClockSkew = TimeSpan.FromMinutes(1),
            }
        );
    }

    private static string? Claim(TokenValidationResult result, string type) =>
        result.Claims.TryGetValue(type, out var value) ? value?.ToString() : null;
}
