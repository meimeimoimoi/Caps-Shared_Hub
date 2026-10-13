using Caps.Common.Application;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Caps.Common.Security;

/// <summary>Bound from the "Sessions" section.</summary>
public sealed class SessionRevocationOptions
{
    /// <summary>
    /// How long a "revoke all" entry is kept. Must exceed the access token lifetime plus clock skew
    /// (Auth:AccessMinutes 15 + 2): after that every older token has expired on its own.
    /// </summary>
    public int RevokeAllTtlMinutes { get; set; } = 20;
}

/// <summary>
/// Redis keys, all short-lived: <c>caps:session:version:{userId}</c> holds the lowest valid token_version,
/// <c>caps:session:revoked:{jti}</c> marks one signed-out access token.
/// </summary>
public sealed class RedisSessionRevocationStore(
    IConnectionMultiplexer redis,
    SessionRevocationOptions options,
    TimeProvider clock,
    ILogger<RedisSessionRevocationStore> logger
) : ISessionRevocationStore
{
    // Only ever raises the stored version, so a late write cannot undo a newer revocation
    private const string RaiseVersion = """
        local current = tonumber(redis.call('GET', KEYS[1]) or '-1')
        if tonumber(ARGV[1]) > current then
            redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
        else
            redis.call('EXPIRE', KEYS[1], ARGV[2])
        end
        return 1
        """;

    // Covers the bearer handler's clock skew, so a token is never accepted after its entry expired
    private static readonly TimeSpan ClockSkew = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan SkipAfterFailure = TimeSpan.FromSeconds(5);
    private long _skipChecksUntilTicks;

    public async Task RevokeAllAsync(Guid userId, int tokenVersion, CancellationToken ct)
    {
        try
        {
            var ttl = (long)TimeSpan.FromMinutes(options.RevokeAllTtlMinutes).TotalSeconds;
            await redis
                .GetDatabase()
                .ScriptEvaluateAsync(RaiseVersion, [VersionKey(userId)], [tokenVersion, ttl]);
        }
        catch (Exception e) when (e is RedisException or TimeoutException)
        {
            logger.LogError(
                e,
                "Could not publish session revocation for user {UserId}; other services accept its old tokens until they expire.",
                userId
            );
        }
    }

    public async Task RevokeTokenAsync(string tokenId, DateTimeOffset expiresAt, CancellationToken ct)
    {
        var ttl = expiresAt - clock.GetUtcNow() + ClockSkew;
        if (ttl <= TimeSpan.Zero)
            return;
        try
        {
            await redis.GetDatabase().StringSetAsync(RevokedKey(tokenId), 1, ttl);
        }
        catch (Exception e) when (e is RedisException or TimeoutException)
        {
            logger.LogError(
                e,
                "Could not publish sign-out of token {TokenId}; other services accept it until it expires.",
                tokenId
            );
        }
    }

    public async Task<bool?> IsRevokedAsync(
        Guid userId,
        int tokenVersion,
        string? tokenId,
        CancellationToken ct
    )
    {
        // While Redis is known to be down, answer "unknown" at once instead of waiting for a timeout on every request
        if (clock.GetUtcNow().UtcTicks < Volatile.Read(ref _skipChecksUntilTicks))
            return null;
        try
        {
            RedisKey[] keys = string.IsNullOrEmpty(tokenId)
                ? [VersionKey(userId)]
                : [VersionKey(userId), RevokedKey(tokenId)];
            var values = await redis.GetDatabase().StringGetAsync(keys);
            if (values[0].TryParse(out int minVersion) && tokenVersion < minVersion)
                return true;
            return values.Length > 1 && values[1].HasValue;
        }
        catch (Exception e) when (e is RedisException or TimeoutException)
        {
            Volatile.Write(ref _skipChecksUntilTicks, (clock.GetUtcNow() + SkipAfterFailure).UtcTicks);
            logger.LogWarning(e, "Session revocation store unavailable; trusting tokens for now.");
            return null;
        }
    }

    private static string VersionKey(Guid userId) => $"caps:session:version:{userId}";

    private static string RevokedKey(string tokenId) => $"caps:session:revoked:{tokenId}";
}
