using Caps.Common.Database;

namespace workflow.Entities.Workspace;

public sealed class Template
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TemplateVersion> Versions { get; set; } = new List<TemplateVersion>();
}
