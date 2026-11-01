using System.Text.Json;
using Caps.Workflow.Application.Features.Templates;

namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>A template (matched by <c>code</c>) and the field schema for its draft version.</summary>
/// <param name="FieldSchema">A non-empty JSON array of field objects.</param>
public sealed record SaveTemplateDraftRequest(
    string? Code,
    string? Name,
    string? Description,
    JsonElement? FieldSchema
)
{
    public SaveTemplateDraftCommand ToCommand(Guid userId) =>
        new(userId, Code, Name, Description, FieldSchema?.GetRawText());
}
