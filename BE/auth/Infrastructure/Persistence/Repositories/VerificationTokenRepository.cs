using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Verification;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for emailed tokens.</summary>
public sealed class VerificationTokenRepository(AuthDbContext db) : IVerificationTokenRepository
{
    public async Task<(Guid Id, Guid UserId)?> FindByHashAsync(
        string tokenHash,
        string purpose,
        CancellationToken ct
    )
    {
        var row = await db
            .VerificationTokens.AsNoTracking()
            .Where(x => x.TokenHash == tokenHash && x.Purpose == purpose)
            .Select(x => new { x.Id, x.UserId })
            .SingleOrDefaultAsync(ct);
        return row == null ? null : (row.Id, row.UserId);
    }

    public Task<VerificationToken> GetAsync(Guid id, CancellationToken ct) =>
        db.VerificationTokens.SingleAsync(x => x.Id == id, ct);

    public Task<VerificationToken?> FindLatestActiveAsync(
        Guid userId,
        string purpose,
        CancellationToken ct
    ) => Active(userId, purpose).OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);

    public Task<bool> AnyCreatedSinceAsync(
        Guid userId,
        string purpose,
        DateTimeOffset since,
        CancellationToken ct
    ) =>
        db.VerificationTokens.AnyAsync(
            x => x.UserId == userId && x.Purpose == purpose && x.CreatedAt > since,
            ct
        );

    public Task InvalidateUnusedAsync(
        Guid userId,
        string purpose,
        DateTimeOffset now,
        CancellationToken ct
    ) =>
        Active(userId, purpose)
            .ExecuteUpdateAsync(x => x.SetProperty(t => t.InvalidatedAt, now), ct);

    public void Add(VerificationToken token) => db.VerificationTokens.Add(token);

    private IQueryable<VerificationToken> Active(Guid userId, string purpose) =>
        db.VerificationTokens.Where(x =>
            x.UserId == userId
            && x.Purpose == purpose
            && x.UsedAt == null
            && x.InvalidatedAt == null
        );
}
