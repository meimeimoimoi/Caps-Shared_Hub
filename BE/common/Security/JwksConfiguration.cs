using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Common.Security;

/// <summary>Reads a bare JWKS document (auth is not an OpenID Connect provider, so there is no discovery document).</summary>
internal sealed class JwksRetriever : IConfigurationRetriever<OpenIdConnectConfiguration>
{
    public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(
        string address,
        IDocumentRetriever retriever,
        CancellationToken cancel
    )
    {
        var json = await retriever.GetDocumentAsync(address, cancel);
        var configuration = new OpenIdConnectConfiguration { JwksUri = address };
        foreach (var key in new JsonWebKeySet(json).GetSigningKeys())
            configuration.SigningKeys.Add(key);
        return configuration;
    }
}

/// <summary>
/// Keeps token validation working while auth is unreachable. Once a JWKS has been downloaded the inner
/// manager keeps serving it when a refresh fails. Before the first download succeeds this returns no keys
/// (so only the configured PEM fallback keys apply) and retries every 30 seconds, or after 5 seconds when a
/// token carries an unknown key id.
/// </summary>
internal sealed class ResilientJwksManager(
    IConfigurationManager<OpenIdConnectConfiguration> inner,
    string issuer,
    TimeProvider clock,
    ILogger logger
) : IConfigurationManager<OpenIdConnectConfiguration>
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan MinRetryDelay = TimeSpan.FromSeconds(5);
    private DateTimeOffset _lastAttempt = DateTimeOffset.MinValue;
    private DateTimeOffset _retryAfter = DateTimeOffset.MinValue;

    public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel)
    {
        if (clock.GetUtcNow() < _retryAfter)
            return Empty();
        _lastAttempt = clock.GetUtcNow();
        try
        {
            return await inner.GetConfigurationAsync(cancel);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            _retryAfter = clock.GetUtcNow() + RetryDelay;
            logger.LogWarning(
                e,
                "JWKS download failed; validating with the configured fallback keys only."
            );
            return Empty();
        }
    }

    /// <summary>Called on an unknown key id: retry soon (auth may be back with a new key), but not on every request.</summary>
    public void RequestRefresh()
    {
        _retryAfter = _lastAttempt + MinRetryDelay;
        inner.RequestRefresh();
    }

    private OpenIdConnectConfiguration Empty() => new() { Issuer = issuer };
}
