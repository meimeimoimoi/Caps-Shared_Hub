using System.Text.Json;
using Caps.Workflow.Application.Features.Templates;

namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>A template (matched by <c>code</c>) and the field schema for its draft version.</summary>
/// <param name="FieldSchema">A non-empty JSON array of field objects.</param>
/// <param name="TaxYear">The tax year the form applies to; omitted keeps the previous version's year.</param>
public sealed record SaveTemplateDraftRequest(
    string? Code,
    string? Name,
    string? Description,
    JsonElement? FieldSchema,
    int? TaxYear
)
{
    public SaveTemplateDraftCommand ToCommand(Guid userId) =>
        new(userId, Code, Name, Description, FieldSchema?.GetRawText(), TaxYear);
}
