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

/// <summary>A template in the admin list: its newest version (often a draft) and the version users see.</summary>
/// <param name="LatestStatus">DRAFT, PUBLISHED or DEPRECATED.</param>
/// <param name="PublishedVersionNo">The version users draft from; null while none is published.</param>
/// <param name="UpdatedAt">When the newest version was started.</param>
public sealed record AdminTemplateSummaryResponse(
    string Id,
    string Code,
    string Name,
    string? Description,
    bool IsActive,
    int LatestVersionNo,
    string LatestStatus,
    int? PublishedVersionNo,
    DateTimeOffset UpdatedAt
)
{
    public static AdminTemplateSummaryResponse From(Template t)
    {
        var latest = t.Versions.MaxBy(v => v.VersionNo);
        var published = t.Versions.FirstOrDefault(v => v.Status == TemplateVersionStatus.Published);
        return new(
            t.Id.ToString(),
            t.Code,
            t.Name,
            t.Description,
            t.IsActive,
            latest?.VersionNo ?? 0,
            latest?.Status ?? TemplateVersionStatus.Draft,
            published?.VersionNo,
            latest?.CreatedAt ?? t.CreatedAt
        );
    }
}

/// <summary>One version of a template as admins see it, drafts included.</summary>
/// <param name="FieldSchema">The stored JSON array, returned as JSON (not as a string).</param>
public sealed record AdminTemplateVersionResponse(
    string Id,
    int VersionNo,
    string Status,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    JsonElement FieldSchema
)
{
    public static AdminTemplateVersionResponse From(TemplateVersion v) =>
        new(
            v.Id.ToString(),
            v.VersionNo,
            v.Status,
            v.CreatedBy.ToString(),
            v.CreatedAt,
            JsonSerializer.Deserialize<JsonElement>(v.FieldSchema)
        );
}

/// <summary>A template with every version, newest first.</summary>
public sealed record AdminTemplateResponse(
    string Id,
    string Code,
    string Name,
    string? Description,
    bool IsActive,
    DateTimeOffset CreatedAt,
    AdminTemplateVersionResponse[] Versions
)
{
    public static AdminTemplateResponse From(Template t) =>
        new(
            t.Id.ToString(),
            t.Code,
            t.Name,
            t.Description,
            t.IsActive,
            t.CreatedAt,
            t.Versions.OrderByDescending(v => v.VersionNo)
                .Select(AdminTemplateVersionResponse.From)
                .ToArray()
        );
}
