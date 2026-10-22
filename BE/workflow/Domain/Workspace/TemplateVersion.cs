using System.Text.Json;
using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>One version of a template's fields (JSON schema); drafts can still change, published ones cannot.</summary>
public sealed class TemplateVersion
{
    private TemplateVersion() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid TemplateId { get; private set; }
    public Template Template { get; } = default!;

    public int VersionNo { get; private set; }
    public string FieldSchema { get; private set; } = default!; // jsonb
    public string Status { get; } = TemplateVersionStatus.Draft;
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// Saves an admin's field schema: rewrites <paramref name="latest"/> while it is a draft, otherwise
    /// starts the next version as a draft, so published versions never change.
    /// </summary>
    public static TemplateVersion SaveDraft(
        Template template,
        TemplateVersion? latest,
        string? fieldSchema,
        Guid createdBy,
        DateTimeOffset now
    )
    {
        var schema = ValidSchema(fieldSchema);
        if (latest is { Status: TemplateVersionStatus.Draft })
        {
            latest.FieldSchema = schema;
            return latest;
        }
        return new TemplateVersion
        {
            TemplateId = template.Id,
            VersionNo = (latest?.VersionNo ?? 0) + 1,
            FieldSchema = schema,
            CreatedBy = createdBy,
            CreatedAt = now,
        };
    }

    // The form is built from this list, so it must be a non-empty array of field objects
    private static string ValidSchema(string? json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json ?? "");
            var root = doc.RootElement;
            if (
                root.ValueKind == JsonValueKind.Array
                && root.GetArrayLength() > 0
                && root.EnumerateArray().All(f => f.ValueKind == JsonValueKind.Object)
            )
            {
                return json!;
            }
        }
        catch (JsonException) { }
        throw WorkflowErrors.FieldSchemaInvalid();
    }
}
