using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>A document template, versioned so old documents keep the fields they were made with.</summary>
public sealed class Template
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TemplateVersion> Versions { get; set; } = [];
}
