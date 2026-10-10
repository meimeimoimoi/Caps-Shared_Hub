using Caps.Common.Database;

namespace auth.Entities;

public sealed class Permission
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Code { get; set; } = default!;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
