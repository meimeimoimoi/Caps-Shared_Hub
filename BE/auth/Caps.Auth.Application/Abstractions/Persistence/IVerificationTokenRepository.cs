using Caps.Auth.Domain.Verification;

namespace Caps.Auth.Application.Abstractions.Persistence;

/// <summary>Email verification and password reset tokens, stored only as hashes.</summary>
public interface IVerificationTokenRepository
{
    /// <summary>Untracked lookup used before taking the user lock.</summary>
    Task<(Guid Id, Guid UserId)?> FindByHashAsync(
        string tokenHash,
        string purpose,
        CancellationToken ct
    );

    Task<VerificationToken> GetAsync(Guid id, CancellationToken ct);

    /// <summary>Newest token of the purpose that is neither used nor invalidated.</summary>
    Task<VerificationToken?> FindLatestActiveAsync(
        Guid userId,
        string purpose,
        CancellationToken ct
    );

    Task<bool> AnyCreatedSinceAsync(
        Guid userId,
        string purpose,
        DateTimeOffset since,
        CancellationToken ct
    );

    /// <summary>Invalidates every unused token of the purpose (runs immediately).</summary>
    Task InvalidateUnusedAsync(
        Guid userId,
        string purpose,
        DateTimeOffset now,
        CancellationToken ct
    );

    void Add(VerificationToken token);
}
