using Caps.Common.Domain;

namespace Caps.Auth.Domain.Users;

/// <summary>A permission code carried in access tokens (seeded reference data).</summary>
public sealed class Permission
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Code { get; set; } = default!;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
