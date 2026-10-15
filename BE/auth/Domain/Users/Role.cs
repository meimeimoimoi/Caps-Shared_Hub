using Caps.Common.Domain;

namespace Caps.Auth.Domain.Users;

/// <summary>An account role (every account gets USER at sign-up); its permissions are granted through RolePermission.</summary>
public sealed class Role
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;

    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RolePermission> RolePermissions { get; set; } = [];
}
