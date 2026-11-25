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

    /// <summary>Reads the immutable schema of a published or previously published version.</summary>
    /// <response code="200">The template version and its schema.</response>
    /// <response code="404">The version has not been released or does not exist.</response>
    [HttpGet("versions/{versionId:guid}")]
    public async Task<IActionResult> Version(
        Guid versionId,
        [FromServices]
            IQueryHandler<GetReleasedTemplateVersionQuery, ReleasedTemplateVersionResponse> handler,
        CancellationToken ct
    )
    {
        var version = await handler.HandleAsync(new(versionId), ct);
        return Ok(ApiResponse<ReleasedTemplateVersionResponse>.Ok(version));
    }

    /// <summary>Downloads the sample Word file of a released version, to show the user's values in the form's own layout.</summary>
    /// <remarks>Only when the version's schema says <c>hasFile</c>.</remarks>
    /// <response code="200">The .docx bytes.</response>
    /// <response code="404">TEMPLATE_NOT_FOUND (not released) or TEMPLATE_FILE_NOT_FOUND (no file).</response>
    [HttpGet("versions/{versionId:guid}/file")]
    public async Task<IActionResult> OpenFile(
        Guid versionId,
        [FromServices] IQueryHandler<OpenTemplateFileQuery, AttachmentFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(versionId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
