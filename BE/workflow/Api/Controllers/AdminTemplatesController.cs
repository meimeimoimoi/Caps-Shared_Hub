using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Templates;
using Caps.Workflow.Domain.Review;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>Template management for knowledge administrators.</summary>
[ApiController, RequirePermission(Permission.KnowledgeManage)]
[Route("api/v1/admin/templates")]
public sealed class AdminTemplatesController(ICurrentUser currentUser) : ControllerBase
{
    private const long UploadLimit = ReviewAttachment.MaxBytes + (64 * 1024);

    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists every template with its newest and published versions.</summary>
    /// <remarks>
    /// Unlike <c>GET /api/v1/templates</c> it includes templates that only have a draft. latestStatus is DRAFT
    /// while a draft waits to be published; publishedVersionNo is the version users draft from (null if none).
    /// </remarks>
    /// <response code="200">The templates by name (may be empty).</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices]
            IQueryHandler<ListAdminTemplatesQuery, AdminTemplateSummaryResponse[]> handler,
        CancellationToken ct
    )
    {
        var templates = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<AdminTemplateSummaryResponse[]>.Ok(templates));
    }

    /// <summary>Returns a template with every version, newest first.</summary>
    /// <remarks>Each version carries its status (DRAFT, PUBLISHED or DEPRECATED) and its fieldSchema.</remarks>
    /// <response code="200">The template.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">TEMPLATE_NOT_FOUND.</response>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices] IQueryHandler<GetAdminTemplateQuery, AdminTemplateResponse> handler,
        CancellationToken ct
    )
    {
        var template = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<AdminTemplateResponse>.Ok(template));
    }

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

    /// <summary>Publishes the template's draft version so users can draft from it.</summary>
    /// <remarks>The previously published version becomes DEPRECATED; documents made from it keep their fields.</remarks>
    /// <response code="200">The published version.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">TEMPLATE_NOT_FOUND.</response>
    /// <response code="409">TEMPLATE_NO_DRAFT: the latest version is already published.</response>
    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(
        Guid id,
        [FromServices] ICommandHandler<PublishTemplateCommand, TemplateVersionResponse> handler,
        CancellationToken ct
    )
    {
        var version = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<TemplateVersionResponse>.Ok(version));
    }

    /// <summary>Uploads the sample Word file of the template's draft version (multipart field <c>file</c>).</summary>
    /// <remarks>
    /// Users see this file with their values written into the blanks each field's <c>anchor</c> points at.
    /// Uploading again replaces the draft's file; published versions keep theirs, so save the fields first to
    /// start a new draft.
    /// </remarks>
    /// <response code="200">The draft version.</response>
    /// <response code="400">ATTACHMENT_REQUIRED, ATTACHMENT_TOO_LARGE, ATTACHMENT_TYPE_INVALID or TEMPLATE_FILE_INVALID (not a .docx).</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">TEMPLATE_NOT_FOUND.</response>
    /// <response code="409">TEMPLATE_NO_DRAFT: the latest version is already published.</response>
    [HttpPut("{id:guid}/file")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> UploadFile(
        Guid id,
        IFormFile? file,
        [FromServices] ICommandHandler<UploadTemplateFileCommand, TemplateVersionResponse> handler,
        CancellationToken ct
    )
    {
        // Size and format are checked by the domain from the bytes themselves
        await using var buffer = new MemoryStream();
        if (file != null)
        {
            await file.CopyToAsync(buffer, ct);
        }
        var version = await handler.HandleAsync(new(id, buffer.ToArray()), ct);
        return Ok(ApiResponse<TemplateVersionResponse>.Ok(version));
    }

    /// <summary>Downloads the sample Word file of one version, drafts included, to preview it before publishing.</summary>
    /// <response code="200">The .docx bytes.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">TEMPLATE_NOT_FOUND (also a version of another template) or TEMPLATE_FILE_NOT_FOUND.</response>
    [HttpGet("{id:guid}/versions/{versionId:guid}/file")]
    public async Task<IActionResult> OpenFile(
        Guid id,
        Guid versionId,
        [FromServices] IQueryHandler<OpenAdminTemplateFileQuery, AttachmentFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(id, versionId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
