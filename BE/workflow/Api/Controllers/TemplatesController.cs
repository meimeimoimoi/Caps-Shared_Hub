using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Templates;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>The template library: only published versions of active templates are visible.</summary>
[ApiController, Authorize, Route("api/v1/templates")]
public sealed class TemplatesController : ControllerBase
{
    /// <summary>Lists the templates users can draft from.</summary>
    /// <remarks>Each item carries the published version a new draft would use.</remarks>
    /// <response code="200">The templates (may be empty).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListTemplatesQuery, TemplateSummaryResponse[]> handler,
        CancellationToken ct
    )
    {
        var templates = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<TemplateSummaryResponse[]>.Ok(templates));
    }

    /// <summary>Returns the form fields of a template's published version.</summary>
    /// <remarks><c>fieldSchema</c> is the JSON array stored with the version.</remarks>
    /// <response code="200">The schema.</response>
    /// <response code="404">TEMPLATE_NOT_FOUND: unknown, inactive or not published yet.</response>
    [HttpGet("{id:guid}/schema")]
    public async Task<IActionResult> Schema(
        Guid id,
        [FromServices] IQueryHandler<GetTemplateSchemaQuery, TemplateSchemaResponse> handler,
        CancellationToken ct
    )
    {
        var schema = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<TemplateSchemaResponse>.Ok(schema));
    }
}
