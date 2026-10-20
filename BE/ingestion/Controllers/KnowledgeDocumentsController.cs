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

    /// <summary>Returns one document version for the split-screen review.</summary>
    /// <remarks>
    /// contentJson is the parsed text shown next to the original: fileUrl streams an uploaded file, while crawled
    /// documents link to sourceUrl on the crawled site. metadata.ingest is the crawler's suggestion.
    /// </remarks>
    /// <response code="200">The document with its legal source and parsed content.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND.</response>
    [HttpGet("{id:guid}/preview")]
    public async Task<IActionResult> Preview(
        Guid id,
        [FromServices] IQueryHandler<GetDocumentPreviewQuery, DocumentPreviewResponse> handler,
        CancellationToken ct
    )
    {
        var document = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<DocumentPreviewResponse>.Ok(document));
    }

    /// <summary>Downloads the original file of an uploaded document.</summary>
    /// <remarks>Crawled documents have no stored file: open sourceUrl from the preview instead.</remarks>
    /// <response code="200">The file bytes.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND or DOCUMENT_FILE_NOT_STORED.</response>
    [HttpGet("{id:guid}/file")]
    public async Task<IActionResult> OpenFile(
        Guid id,
        [FromServices] IQueryHandler<OpenDocumentFileQuery, DocumentFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(id), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }

    /// <summary>Rejects a pending document with a reason.</summary>
    /// <remarks>
    /// Only PENDING documents can be rejected; the document then leaves the pending queue. The reason (at most
    /// 1000 characters) is kept as rejectionReason, and approvedBy/approvedAt record who decided and when.
    /// </remarks>
    /// <response code="200">Rejected.</response>
    /// <response code="400">Invalid body or REJECTION_REASON_REQUIRED.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND.</response>
    /// <response code="409">DOCUMENT_NOT_PENDING: the document was already decided.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/reject"), RequireSessionCheck]
    public async Task<IActionResult> Reject(
        Guid id,
        RejectDocumentRequest r,
        [FromServices] ICommandHandler<RejectDocumentCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(r.ToCommand(UserId, id), ct);
        return Ok(ApiResponse.Message("Document rejected."));
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
