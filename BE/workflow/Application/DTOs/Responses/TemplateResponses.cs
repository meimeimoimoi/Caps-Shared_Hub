using System.Text.Json;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A template users can draft from, with the published version they would use.</summary>
public sealed record TemplateSummaryResponse(
    string Id,
    string Code,
    string Name,
    string? Description,
    string VersionId,
    int VersionNo,
    DateTimeOffset UpdatedAt
)
{
    public static TemplateSummaryResponse From(TemplateVersion v) =>
        new(
            v.TemplateId.ToString(),
            v.Template.Code,
            v.Template.Name,
            v.Template.Description,
            v.Id.ToString(),
            v.VersionNo,
            v.CreatedAt
        );
}

/// <summary>The fields of a template's published version, to build the input form.</summary>
/// <param name="FieldSchema">The stored JSON array, returned as JSON (not as a string).</param>
public sealed record TemplateSchemaResponse(
    string TemplateId,
    string TemplateVersionId,
    int VersionNo,
    JsonElement FieldSchema
)
{
    public static TemplateSchemaResponse From(TemplateVersion v) =>
        new(
            v.TemplateId.ToString(),
            v.Id.ToString(),
            v.VersionNo,
            JsonSerializer.Deserialize<JsonElement>(v.FieldSchema)
        );
}

/// <summary>The template version an admin just saved.</summary>
/// <param name="Status">DRAFT, PUBLISHED or DEPRECATED.</param>
public sealed record TemplateVersionResponse(
    string TemplateId,
    string TemplateVersionId,
    int VersionNo,
    string Status
)
{
    public static TemplateVersionResponse From(TemplateVersion v) =>
        new(v.TemplateId.ToString(), v.Id.ToString(), v.VersionNo, v.Status);
}
