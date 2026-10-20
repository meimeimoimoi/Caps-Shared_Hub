namespace Caps.Auth.Application.Abstractions.Persistence;

/// <summary>Read-only view of what a user may do (roles and the permissions they grant).</summary>
public interface IUserAccessReader
{
    Task<string[]> GetRoleCodesAsync(Guid userId, CancellationToken ct);
}
