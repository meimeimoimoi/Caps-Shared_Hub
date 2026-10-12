using Caps.Auth.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace Caps.Auth.Infrastructure.Persistence;

public sealed class UnitOfWork(AuthDbContext db) : IUnitOfWork
{
    public async Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
        new Transaction(await db.Database.BeginTransactionAsync(ct));

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e)
            when (e.InnerException
                    is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }
            )
        {
            throw new UniqueConstraintException(e);
        }
    }

    private sealed class Transaction(IDbContextTransaction inner) : ITransaction
    {
        public Task CommitAsync(CancellationToken ct) => inner.CommitAsync(ct);

        public ValueTask DisposeAsync() => inner.DisposeAsync();
    }
}
