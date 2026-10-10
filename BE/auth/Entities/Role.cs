using Caps.Common.Database;

namespace auth.Entities;

public sealed class Role
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
