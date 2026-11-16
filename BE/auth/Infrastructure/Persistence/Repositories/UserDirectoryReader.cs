using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence.Repositories;

/// <summary>EF Core queries behind the System Admin's account list; nothing is tracked.</summary>
public sealed class UserDirectoryReader(AuthDbContext db) : IUserDirectoryReader
{
    public async Task<ManagedUserPageResponse> ListAsync(
        string? search,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct
    )
    {
        var query = db.Users.AsNoTracking();
        if (status != null)
        {
            query = query.Where(x => x.Status == status);
        }
        if (search != null)
        {
            // Escape LIKE wildcards so a typed % or _ is matched literally
            var pattern =
                "%" + search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(x =>
                EF.Functions.ILike(x.Email, pattern, "\\")
                || EF.Functions.ILike(x.FullName, pattern, "\\")
            );
        }
        var total = await query.CountAsync(ct);
        var rows = await Project(
                query
                    .OrderByDescending(x => x.CreatedAt)
                    .ThenBy(x => x.Id)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
            )
            .ToListAsync(ct);
        return new(rows.Select(ToResponse).ToArray(), page, pageSize, total);
    }

    public async Task<ManagedUserResponse?> FindAsync(Guid userId, CancellationToken ct)
    {
        var row = await Project(db.Users.AsNoTracking().Where(x => x.Id == userId))
            .SingleOrDefaultAsync(ct);
        return row == null ? null : ToResponse(row);
    }

    private static IQueryable<Row> Project(IQueryable<User> users) =>
        users.Select(x => new Row(
            x.Id,
            x.Email,
            x.FullName,
            x.UserRoles.Select(r => r.Role.Code).ToList(),
            x.Status,
            x.CreatedAt,
            x.RefreshTokens.Max(t => (DateTimeOffset?)t.IssuedAt),
            x.SuspendedReason,
            x.SuspendedAt
        ));

    private static ManagedUserResponse ToResponse(Row x) =>
        new(
            x.Id.ToString(),
            x.Email,
            x.FullName,
            x.Roles.Order().ToArray(),
            x.Status,
            x.CreatedAt,
            x.LastSignInAt,
            x.SuspendedReason,
            x.SuspendedAt
        );

    private sealed record Row(
        Guid Id,
        string Email,
        string FullName,
        List<string> Roles,
        string Status,
        DateTimeOffset CreatedAt,
        DateTimeOffset? LastSignInAt,
        string? SuspendedReason,
        DateTimeOffset? SuspendedAt
    );
}
