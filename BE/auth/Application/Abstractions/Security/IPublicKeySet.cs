namespace Caps.Auth.Application.Abstractions.Security;

/// <summary>A public RSA signing key in JSON Web Key terms (RFC 7517): safe to publish.</summary>
/// <param name="Modulus">Base64url modulus (<c>n</c>).</param>
/// <param name="Exponent">Base64url exponent (<c>e</c>).</param>
public sealed record PublicSigningKey(string KeyId, string Modulus, string Exponent);

/// <summary>Every public key that may have signed a live access token, so other services can verify it.</summary>
public interface IPublicKeySet
{
    IReadOnlyList<PublicSigningKey> Keys { get; }
}
