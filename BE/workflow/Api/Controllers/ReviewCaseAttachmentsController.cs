using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Attachments;
using Caps.Workflow.Domain.Review;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// Files the client and the expert add to a review case: PDF, JPEG, PNG, WebP or Word (.docx), up to 10 MB each and
/// 20 per case, while the review runs or a dispute is open. Only the two parties see them.
/// </summary>
[ApiController, Authorize, Route("api/v1/review-cases/{caseId:guid}/attachments")]
public sealed class ReviewCaseAttachmentsController(ICurrentUser currentUser) : ControllerBase
{
    private const long UploadLimit = ReviewAttachment.MaxBytes + (64 * 1024);

    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Uploads one file (multipart field <c>file</c>).</summary>
    /// <response code="200">The stored file.</response>
    /// <response code="400">ATTACHMENT_REQUIRED, ATTACHMENT_TOO_LARGE, ATTACHMENT_TYPE_INVALID or TEXT_REQUIRED (no file name).</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party).</response>
    /// <response code="409">ATTACHMENTS_CLOSED or ATTACHMENT_LIMIT.</response>
    [HttpPost]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> Add(
        Guid caseId,
        IFormFile? file,
        [FromServices] ICommandHandler<AddAttachmentCommand, AttachmentResponse> handler,
        CancellationToken ct
    )
    {
        // Size and format are checked by the domain from the bytes themselves
        await using var buffer = new MemoryStream();
        if (file != null)
        {
            await file.CopyToAsync(buffer, ct);
        }
        var attachment = await handler.HandleAsync(
            new(UserId, caseId, file?.FileName, buffer.ToArray()),
            ct
        );
        return Ok(ApiResponse<AttachmentResponse>.Ok(attachment));
    }

    /// <summary>Returns the case's files, oldest first.</summary>
    /// <response code="200">The files (may be empty).</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        Guid caseId,
        [FromServices] IQueryHandler<ListAttachmentsQuery, AttachmentResponse[]> handler,
        CancellationToken ct
    )
    {
        var files = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<AttachmentResponse[]>.Ok(files));
    }

    /// <summary>Downloads one file.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or ATTACHMENT_NOT_FOUND.</response>
    [HttpGet("{attachmentId:guid}/file")]
    public async Task<IActionResult> Open(
        Guid caseId,
        Guid attachmentId,
        [FromServices] IQueryHandler<OpenAttachmentQuery, AttachmentFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(UserId, caseId, attachmentId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
