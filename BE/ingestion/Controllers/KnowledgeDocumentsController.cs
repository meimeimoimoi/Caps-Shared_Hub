using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Ingestion.DTOs.Requests;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Features.Documents;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>Legal document versions a Knowledge Admin reviews before they are indexed for the AI.</summary>
[ApiController, RequirePermission(Permission.KnowledgeManage)]
[Route("api/v1/knowledge/documents")]
public sealed class KnowledgeDocumentsController(ICurrentUser currentUser) : ControllerBase
{
    private const long UploadLimit = DocumentFiles.MaxBytes + (64 * 1024);

    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists documents waiting for review (PENDING), oldest first.</summary>
    /// <remarks>
    /// page starts at 1; pageSize defaults to 20 and is at most 100. hasContent = false means the worker has not
    /// split the uploaded file yet; lastError says why it could not.
    /// </remarks>
    /// <response code="200">The page with the total number of pending documents.</response>
    /// <response code="400">INVALID_PAGING.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    [HttpGet("pending")]
    public async Task<IActionResult> ListPending(
        [FromServices]
            IQueryHandler<ListPendingDocumentsQuery, PageResponse<DocumentSummaryResponse>> handler,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var documents = await handler.HandleAsync(new(page, pageSize), ct);
        return Ok(ApiResponse<PageResponse<DocumentSummaryResponse>>.Ok(documents));
    }

    /// <summary>Uploads a legal document file for review (multipart form).</summary>
    /// <remarks>
    /// file: PDF or DOCX up to 20 MB, checked by its content. documentNumber, docType and title describe the
    /// legal source; a number already stored adds a new version and keeps the stored metadata. The document is
    /// PENDING without content until the crawler worker has split it into articles (hasContent).
    /// </remarks>
    /// <response code="200">The new document version.</response>
    /// <response code="400">Invalid fields, FILE_REQUIRED, FILE_TOO_LARGE, FILE_INVALID_TYPE or INVALID_EFFECTIVE_PERIOD.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="409">DOCUMENT_DUPLICATE: the same file was already uploaded.</response>
    [HttpPost("upload")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> Upload(
        [FromForm] UploadDocumentRequest r,
        [FromServices] ICommandHandler<UploadDocumentCommand, DocumentSummaryResponse> handler,
        CancellationToken ct
    )
    {
        // Size and format are checked from the bytes themselves
        await using var buffer = new MemoryStream();
        if (r.File != null)
            await r.File.CopyToAsync(buffer, ct);
        var document = await handler.HandleAsync(r.ToCommand(UserId, buffer.ToArray()), ct);
        return Ok(ApiResponse<DocumentSummaryResponse>.Ok(document));
    }
}
