using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence.Repositories;

/// <summary>EF Core queries behind the admin dashboard; nothing is tracked.</summary>
public sealed class UserStatsReader(AuthDbContext db) : IUserStatsReader
{
    public async Task<IReadOnlyList<DateTimeOffset>> ListSignupsAsync(
        DateTimeOffset start,
        DateTimeOffset endBefore,
        CancellationToken ct
    ) =>
        await Verified()
            .Where(x => x.CreatedAt >= start && x.CreatedAt < endBefore)
            .Select(x => x.CreatedAt)
            .ToListAsync(ct);

    public Task<int> CountUsersBeforeAsync(DateTimeOffset before, CancellationToken ct) =>
        Verified().CountAsync(x => x.CreatedAt < before, ct);

    private IQueryable<User> Verified() =>
        db.Users.AsNoTracking().Where(x => x.Status != UserStatus.PendingVerification);
}
