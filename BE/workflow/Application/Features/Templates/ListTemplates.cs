using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>The template library users pick from.</summary>
public sealed record ListTemplatesQuery;

/// <summary>Lists active templates that have a published version; drafts and retired ones are hidden.</summary>
public sealed class ListTemplatesHandler(ITemplateRepository templates)
    : IQueryHandler<ListTemplatesQuery, TemplateSummaryResponse[]>
{
    public async Task<TemplateSummaryResponse[]> HandleAsync(
        ListTemplatesQuery query,
        CancellationToken ct
    )
    {
        var versions = await templates.ListPublishedAsync(ct);
        return versions.Select(TemplateSummaryResponse.From).ToArray();
    }
}
