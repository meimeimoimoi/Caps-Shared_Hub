using Caps.Auth.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Auth.Api.Controllers;

/// <summary>Public keys other services use to verify access tokens without holding any secret.</summary>
[ApiController, AllowAnonymous, Route(".well-known")]
public sealed class KeysController(JwtSigningKeys keys) : ControllerBase
{
    /// <summary>Returns the JSON Web Key Set with every public key that may have signed a live token.</summary>
    /// <remarks>
    /// The key id (<c>kid</c>) in a token's header selects the key. During rotation the old key stays here
    /// until its tokens expire. Services cache this document and refresh it periodically.
    /// </remarks>
    /// <response code="200">The key set (RS256, signature keys only).</response>
    [HttpGet("jwks.json")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public IActionResult Jwks()
    {
        var set = keys.PublicKeys.Select(key =>
        {
            var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(key);
            return new
            {
                kty = "RSA",
                use = "sig",
                alg = SecurityAlgorithms.RsaSha256,
                kid = key.KeyId,
                n = jwk.N,
                e = jwk.E,
            };
        });
        return Ok(new { keys = set });
    }
}
