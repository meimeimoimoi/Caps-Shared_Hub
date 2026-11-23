using Caps.Billing.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>
/// Postgres transaction-scoped advisory lock keyed by the user id: released on commit/rollback and works
/// before the user has any row to lock. The "billing:" prefix keeps it apart from other services' locks
/// on the same database.
/// </summary>
public sealed class BillingUserLock(BillingDbContext db) : IBillingUserLock
{
    public Task AcquireAsync(Guid userId, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({"billing:" + userId}, 0))",
            ct
        );
}
