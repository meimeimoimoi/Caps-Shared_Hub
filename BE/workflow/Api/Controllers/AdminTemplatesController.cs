using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Templates;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>Template management for knowledge administrators.</summary>
[ApiController, RequirePermission(Permission.KnowledgeManage)]
[Route("api/v1/admin/templates")]
public sealed class AdminTemplatesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Creates a template or updates it, saving the field schema as a draft version.</summary>
    /// <remarks>
    /// The template is matched by <c>code</c> and created on first use. While its latest version is a draft,
    /// that draft is overwritten; after it is published, a new draft version (N+1) is started. Users only see
    /// published versions.
    /// </remarks>
    /// <response code="200">The saved draft version.</response>
    /// <response code="400">TEMPLATE_INVALID (code or name missing) or FIELD_SCHEMA_INVALID.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    [HttpPost]
    public async Task<IActionResult> Save(
        SaveTemplateDraftRequest r,
        [FromServices] ICommandHandler<SaveTemplateDraftCommand, TemplateVersionResponse> handler,
        CancellationToken ct
    )
    {
        var version = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<TemplateVersionResponse>.Ok(version));
    }
}
