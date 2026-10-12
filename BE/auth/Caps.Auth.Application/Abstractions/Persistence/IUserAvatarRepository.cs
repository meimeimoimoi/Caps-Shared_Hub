using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Abstractions.Persistence;

public interface IUserAvatarRepository
{
    Task<UserAvatar?> GetAsync(Guid userId, CancellationToken ct);
    Task<DateTimeOffset?> GetUpdatedAtAsync(Guid userId, CancellationToken ct);
    Task<AvatarFile?> GetFileAsync(Guid userId, CancellationToken ct);
    Task DeleteAsync(Guid userId, CancellationToken ct);
    void Add(UserAvatar avatar);
}
