using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>Every template for knowledge admins, drafts included.</summary>
public sealed record ListAdminTemplatesQuery;

/// <summary>Lists templates by name with their newest and published versions.</summary>
public sealed class ListAdminTemplatesHandler(ITemplateRepository templates)
    : IQueryHandler<ListAdminTemplatesQuery, AdminTemplateSummaryResponse[]>
{
    public async Task<AdminTemplateSummaryResponse[]> HandleAsync(
        ListAdminTemplatesQuery query,
        CancellationToken ct
    )
    {
        var all = await templates.ListWithVersionsAsync(ct);
        return all.Select(AdminTemplateSummaryResponse.From).ToArray();
    }
}
