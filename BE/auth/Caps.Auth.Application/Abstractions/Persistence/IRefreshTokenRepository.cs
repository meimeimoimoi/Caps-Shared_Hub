using Caps.Auth.Domain.Sessions;

namespace Caps.Auth.Application.Abstractions.Persistence;

/// <summary>Refresh sessions, looked up by hash; also tells whether a token was rotated (reuse detection).</summary>
public interface IRefreshTokenRepository
{
    /// <summary>Untracked lookup used before taking the user lock.</summary>
    Task<(Guid Id, Guid UserId)?> FindByHashAsync(string tokenHash, CancellationToken ct);

    Task<AuthRefreshToken> GetAsync(Guid id, CancellationToken ct);
    Task<AuthRefreshToken?> FindForUserAsync(string tokenHash, Guid userId, CancellationToken ct);

    /// <summary>True when the token was already rotated into a newer one.</summary>
    Task<bool> HasSuccessorAsync(Guid id, CancellationToken ct);

    Task RevokeAllActiveAsync(Guid userId, DateTimeOffset now, CancellationToken ct);
    void Add(AuthRefreshToken token);
}
