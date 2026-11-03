using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>A document template, versioned so old documents keep the fields they were made with.</summary>
public sealed class Template
{
    private Template() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }
    public bool IsActive { get; } = true;
    public DateTimeOffset CreatedAt { get; private set; }

    public ICollection<TemplateVersion> Versions { get; } = [];

    /// <summary>Starts a new template; its fields come with its first version.</summary>
    public static Template Create(
        string? code,
        string? name,
        string? description,
        DateTimeOffset now
    )
    {
        var template = new Template { Code = Required(code, "Code"), CreatedAt = now };
        template.Describe(name, description);
        return template;
    }

    /// <summary>Sets the name and description users see when picking a template.</summary>
    public void Describe(string? name, string? description)
    {
        Name = Required(name, "Name");
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value)
            ? throw WorkflowErrors.TemplateInvalid(field)
            : value.Trim();
}
