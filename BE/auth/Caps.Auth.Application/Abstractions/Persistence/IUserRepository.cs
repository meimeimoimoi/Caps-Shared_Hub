using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Abstractions.Persistence;

public interface IUserRepository
{
    Task<User?> FindAsync(Guid id, CancellationToken ct);

    /// <summary>Loads the user with a row lock so concurrent account changes run one at a time.</summary>
    Task<User?> LockAsync(Guid id, CancellationToken ct);

    Task<Guid?> FindIdByEmailAsync(string normalizedEmail, CancellationToken ct);
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct);
    Task<bool> HasRoleAsync(Guid userId, string roleCode, CancellationToken ct);

    /// <summary>Adds a new user together with the given role.</summary>
    Task AddAsync(User user, string roleCode, CancellationToken ct);
}
