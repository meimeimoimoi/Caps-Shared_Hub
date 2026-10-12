using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence.Repositories;

public sealed class UserRepository(AuthDbContext db) : IUserRepository, IUserAccessReader
{
    public async Task<User?> FindAsync(Guid id, CancellationToken ct) =>
        await db.Users.FindAsync([id], ct);

    public Task<User?> LockAsync(Guid id, CancellationToken ct) =>
        db
            .Users.FromSqlInterpolated($"SELECT * FROM identity.users WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct);

    public Task<Guid?> FindIdByEmailAsync(string normalizedEmail, CancellationToken ct) =>
        db
            .Users.Where(x => x.Email == normalizedEmail)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync(ct);

    public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct) =>
        db.Users.AnyAsync(x => x.Email == normalizedEmail, ct);

    public Task<bool> HasRoleAsync(Guid userId, string roleCode, CancellationToken ct) =>
        db.UserRoles.AnyAsync(x => x.UserId == userId && x.Role.Code == roleCode, ct);

    public async Task AddAsync(User user, string roleCode, CancellationToken ct)
    {
        var role = await db.Roles.SingleAsync(x => x.Code == roleCode, ct);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
    }

    public Task<string[]> GetRoleCodesAsync(Guid userId, CancellationToken ct) =>
        db.UserRoles.Where(x => x.UserId == userId).Select(x => x.Role.Code).ToArrayAsync(ct);

    public Task<string[]> GetPermissionCodesAsync(Guid userId, CancellationToken ct) =>
        db
            .UserRoles.Where(x => x.UserId == userId)
            .SelectMany(x => x.Role.RolePermissions)
            .Select(x => x.Permission.Code)
            .Distinct()
            .ToArrayAsync(ct);
}
