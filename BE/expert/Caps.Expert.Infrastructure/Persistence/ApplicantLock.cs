using Caps.Expert.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

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
