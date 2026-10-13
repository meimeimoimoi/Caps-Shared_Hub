using Caps.Expert.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Caps.Expert.Infrastructure.Persistence;

public sealed class UnitOfWork(ExpertDbContext db) : IUnitOfWork
{
    public async Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
        new Transaction(await db.Database.BeginTransactionAsync(ct));

    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);

    private sealed class Transaction(IDbContextTransaction inner) : ITransaction
    {
        public Task CommitAsync(CancellationToken ct) => inner.CommitAsync(ct);

        public ValueTask DisposeAsync() => inner.DisposeAsync();
    }
}

/// <summary>
/// Postgres transaction-scoped advisory lock keyed by the user id: released on commit/rollback and works
/// before the applicant has any row to lock.
/// </summary>
public sealed class ApplicantLock(ExpertDbContext db) : IApplicantLock
{
    public Task AcquireAsync(Guid userId, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({userId.ToString()}, 0))",
            ct
        );
}
