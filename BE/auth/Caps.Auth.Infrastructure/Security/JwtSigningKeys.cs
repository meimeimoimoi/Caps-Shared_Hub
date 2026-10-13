using System.Security.Cryptography;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Common.Security;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Auth.Infrastructure.Security;

/// <summary>Bound from the "Jwt" section of the auth service.</summary>
public sealed class JwtSigningOptions
{
    /// <summary>The first key signs new tokens; the others are only published so tokens they signed stay valid during rotation.</summary>
    public List<JwtSigningKeyEntry> SigningKeys { get; set; } = [];

    /// <summary>Development only: where the generated key is kept when no signing key is configured.</summary>
    public string? DevKeyPath { get; set; }
}

/// <summary>A private RSA key given inline (user-secrets / environment) or as a file (mounted secret).</summary>
public sealed class JwtSigningKeyEntry
{
    public string? PrivateKeyPem { get; set; }
    public string? PrivateKeyPath { get; set; }
}

/// <summary>Auth's RSA keys: the private key signs access tokens, the public halves go into the JWKS.</summary>
public sealed class JwtSigningKeys : ILocalValidationKeys, IPublicKeySet
{
    private JwtSigningKeys(IReadOnlyList<RsaSecurityKey> keys)
    {
        Signing = new SigningCredentials(keys[0], SecurityAlgorithms.RsaSha256);
        PublicKeys = keys.Select(RsaKeys.PublicOnly).ToArray();
        Keys = PublicKeys.Select(ToJwk).ToArray();
    }

    public SigningCredentials Signing { get; }
    public IReadOnlyList<RsaSecurityKey> PublicKeys { get; }
    IEnumerable<SecurityKey> ILocalValidationKeys.Keys => PublicKeys;

    /// <summary>The public keys in JWK terms, as published at /.well-known/jwks.json.</summary>
    public IReadOnlyList<PublicSigningKey> Keys { get; }

    /// <summary>
    /// Loads the configured keys. Without any, Development generates one key and keeps it in
    /// <see cref="JwtSigningOptions.DevKeyPath"/> (default: the user's local app data, outside the repo).
    /// </summary>
    public static JwtSigningKeys Load(JwtSigningOptions options, bool allowDevKey)
    {
        var keys = options.SigningKeys.ConvertAll(x => RsaKeys.FromPem(ReadPem(x)));
        if (keys.Count > 0)
            return new JwtSigningKeys(keys);
        if (!allowDevKey)
        {
            throw new InvalidOperationException(
                "Configure Jwt:SigningKeys:0:PrivateKeyPem or PrivateKeyPath outside Development."
            );
        }

        return new JwtSigningKeys([RsaKeys.FromPem(LoadOrCreateDevKey(options.DevKeyPath))]);
    }

    private static PublicSigningKey ToJwk(RsaSecurityKey key)
    {
        var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(key);
        return new PublicSigningKey(key.KeyId, jwk.N, jwk.E);
    }

    private static string ReadPem(JwtSigningKeyEntry entry) =>
        !string.IsNullOrWhiteSpace(entry.PrivateKeyPem) ? entry.PrivateKeyPem
        : !string.IsNullOrWhiteSpace(entry.PrivateKeyPath) ? File.ReadAllText(entry.PrivateKeyPath)
        : throw new InvalidOperationException(
            "Each Jwt:SigningKeys entry needs PrivateKeyPem or PrivateKeyPath."
        );

    private static string LoadOrCreateDevKey(string? path)
    {
        path ??= Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "caps-shared-hub",
            "jwt-dev-signing-key.pem"
        );
        if (File.Exists(path))
            return File.ReadAllText(path);
        using var rsa = RSA.Create(2048);
        var pem = rsa.ExportPkcs8PrivateKeyPem();
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        // Write then move, so a concurrently starting instance never reads a half-written key
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        File.WriteAllText(temp, pem);
        try
        {
            File.Move(temp, path);
        }
        catch (IOException) when (File.Exists(path))
        {
            File.Delete(temp);
        }
        return File.ReadAllText(path);
    }
}
