using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Common.Security;

/// <summary>RSA key helpers shared by the signer (auth) and the validators (every service).</summary>
public static class RsaKeys
{
    /// <summary>
    /// Loads a PEM key (private or public). The key id is the RFC 7638 thumbprint of the public part,
    /// so the same key always gets the same id in tokens, the JWKS and PEM fallbacks.
    /// </summary>
    public static RsaSecurityKey FromPem(string pem)
    {
        var rsa = RSA.Create();
        rsa.ImportFromPem(pem);
        return new RsaSecurityKey(rsa) { KeyId = KeyIdOf(rsa) };
    }

    /// <summary>The public half of a key, safe to publish.</summary>
    public static RsaSecurityKey PublicOnly(RsaSecurityKey key) =>
        new(key.Rsa?.ExportParameters(false) ?? key.Parameters) { KeyId = key.KeyId };

    private static string KeyIdOf(RSA rsa)
    {
        var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(
            new RsaSecurityKey(rsa.ExportParameters(false))
        );
        return Base64UrlEncoder.Encode(jwk.ComputeJwkThumbprint());
    }
}
