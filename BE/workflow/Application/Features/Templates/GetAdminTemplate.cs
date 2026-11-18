using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>One template for knowledge admins, with every version.</summary>
public sealed record GetAdminTemplateQuery(Guid TemplateId);

/// <summary>Returns the template with all its versions, newest first, whatever their status.</summary>
public sealed class GetAdminTemplateHandler(ITemplateRepository templates)
    : IQueryHandler<GetAdminTemplateQuery, AdminTemplateResponse>
{
    public async Task<AdminTemplateResponse> HandleAsync(
        GetAdminTemplateQuery query,
        CancellationToken ct
    )
    {
        var template =
            await templates.FindWithVersionsAsync(query.TemplateId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        return AdminTemplateResponse.From(template);
    }
}
