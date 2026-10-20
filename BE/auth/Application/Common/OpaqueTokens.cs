using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Caps.Auth.Application.Common;

/// <summary>Random secrets sent to users; only their hashes are stored.</summary>
public static class OpaqueTokens
{
    public static string NewSecret() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

    public static string NewCode() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    /// <summary>6-digit codes collide across users, so hash them with the user id; always look up by user.</summary>
    public static string HashCode(Guid userId, string code) => Hash($"{userId:N}:{code}");

    /// <summary>Constant-time comparison so response timing reveals nothing about the hash.</summary>
    public static bool HashEquals(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(a),
            Encoding.ASCII.GetBytes(b)
        );
}
