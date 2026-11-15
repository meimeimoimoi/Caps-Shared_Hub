using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>Reads one immutable, released template version.</summary>
public sealed record GetReleasedTemplateVersionQuery(Guid VersionId);

public sealed record ReleasedTemplateVersionResponse(
    TemplateSummaryResponse Template,
    TemplateSchemaResponse Schema
);

public sealed class GetReleasedTemplateVersionHandler(ITemplateRepository templates)
    : IQueryHandler<GetReleasedTemplateVersionQuery, ReleasedTemplateVersionResponse>
{
    public async Task<ReleasedTemplateVersionResponse> HandleAsync(
        GetReleasedTemplateVersionQuery query,
        CancellationToken ct
    )
    {
        var version =
            await templates.FindReleasedVersionAsync(query.VersionId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        return new(TemplateSummaryResponse.From(version), TemplateSchemaResponse.From(version));
    }
}
