using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>The form fields of one template.</summary>
public sealed record GetTemplateSchemaQuery(Guid TemplateId);

/// <summary>Returns the published version's fields; a draft-only or inactive template does not exist to users.</summary>
public sealed class GetTemplateSchemaHandler(ITemplateRepository templates)
    : IQueryHandler<GetTemplateSchemaQuery, TemplateSchemaResponse>
{
    public async Task<TemplateSchemaResponse> HandleAsync(
        GetTemplateSchemaQuery query,
        CancellationToken ct
    )
    {
        var version =
            await templates.FindPublishedAsync(query.TemplateId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        return TemplateSchemaResponse.From(version);
    }
}
