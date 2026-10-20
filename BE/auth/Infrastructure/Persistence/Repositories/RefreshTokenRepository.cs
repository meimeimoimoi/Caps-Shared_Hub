using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Sessions;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for refresh sessions.</summary>
public sealed class RefreshTokenRepository(AuthDbContext db) : IRefreshTokenRepository
{
    public async Task<(Guid Id, Guid UserId)?> FindByHashAsync(
        string tokenHash,
        CancellationToken ct
    )
    {
        var row = await db
            .RefreshTokens.AsNoTracking()
            .Where(x => x.TokenHash == tokenHash)
            .Select(x => new { x.Id, x.UserId })
            .SingleOrDefaultAsync(ct);
        return row == null ? null : (row.Id, row.UserId);
    }

    public Task<AuthRefreshToken> GetAsync(Guid id, CancellationToken ct) =>
        db.RefreshTokens.SingleAsync(x => x.Id == id, ct);

    public Task<AuthRefreshToken?> FindForUserAsync(
        string tokenHash,
        Guid userId,
        CancellationToken ct
    ) =>
        db.RefreshTokens.SingleOrDefaultAsync(
            x => x.TokenHash == tokenHash && x.UserId == userId,
            ct
        );

    public Task<bool> HasSuccessorAsync(Guid id, CancellationToken ct) =>
        db.RefreshTokens.AnyAsync(x => x.RotatedFrom == id, ct);

    public Task RevokeAllActiveAsync(Guid userId, DateTimeOffset now, CancellationToken ct) =>
        db
            .RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null)
            .ExecuteUpdateAsync(x => x.SetProperty(t => t.RevokedAt, now), ct);

    public void Add(AuthRefreshToken token) => db.RefreshTokens.Add(token);
}
