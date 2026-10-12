using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Business;
using Caps.Auth.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Caps.Auth.Infrastructure.Persistence.Repositories;

public sealed class UserAvatarRepository(AuthDbContext db) : IUserAvatarRepository
{
    public Task<UserAvatar?> GetAsync(Guid userId, CancellationToken ct) =>
        db.UserAvatars.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public Task<DateTimeOffset?> GetUpdatedAtAsync(Guid userId, CancellationToken ct) =>
        db
            .UserAvatars.Where(x => x.UserId == userId)
            .Select(x => (DateTimeOffset?)x.UpdatedAt)
            .SingleOrDefaultAsync(ct);

    public Task<AvatarFile?> GetFileAsync(Guid userId, CancellationToken ct) =>
        db
            .UserAvatars.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => new AvatarFile(x.ContentType, x.Data, x.UpdatedAt))
            .SingleOrDefaultAsync(ct);

    public Task DeleteAsync(Guid userId, CancellationToken ct) =>
        db.UserAvatars.Where(x => x.UserId == userId).ExecuteDeleteAsync(ct);

    public void Add(UserAvatar avatar) => db.UserAvatars.Add(avatar);
}

public sealed class BusinessProfileRepository(AuthDbContext db) : IBusinessProfileRepository
{
    public Task<BusinessProfile?> GetAsync(Guid userId, CancellationToken ct) =>
        db.BusinessProfiles.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public void Add(BusinessProfile profile) => db.BusinessProfiles.Add(profile);
}
