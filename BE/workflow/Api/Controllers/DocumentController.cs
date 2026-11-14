using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;
using static Caps.Workflow.Api.DTOs.Requests.DocumentRequests;
using static Caps.Workflow.Application.Features.Documents.CreateDocument;
using static Caps.Workflow.Application.Features.Documents.CreateInputSnapshot;
using static Caps.Workflow.Application.Features.Documents.DownloadDocumentVersion;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;
using static Caps.Workflow.Application.Features.Documents.GenerateDraft;
using static Caps.Workflow.Application.Features.Documents.GetDocument;
using static Caps.Workflow.Application.Features.Documents.GetDocumentVersionDetail;
using static Caps.Workflow.Application.Features.Documents.GetDocumentVersions;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// Endpoints for managing user document workspaces, input snapshots, AI draft generation, and version exports.
/// </summary>
[Route("api/v1/documents")]
[ApiController]
[RequirePermission(Permission.BusinessRead)]
public sealed class DocumentController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>
    /// 1. Create a new document draft workspace.
    /// </summary>
    /// <param name="request">Document creation metadata, period range, and template reference.</param>
    /// <param name="handler">Command handler for document creation.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">The newly created document summary.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<DocumentSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateDocument(
        [FromBody] CreateDocumentRequest request,
        [FromServices] ICommandHandler<CreateDocumentCommand, DocumentSummaryDto> handler,
        CancellationToken ct
    )
    {
        var command = new CreateDocumentCommand(
            UserId,
            request.Title,
            request.TemplateId,
            request.PeriodStart,
            request.PeriodEnd,
            request.Source,
            request.Metadata
        );
        var result = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<DocumentSummaryDto>.Ok(result));
    }

    /// <summary>
    /// 2. Get paginated document workspaces belonging to the current user.
    /// </summary>
    /// <param name="status">Optional status filter (e.g. DRAFT, IN_REVIEW, VERIFIED).</param>
    /// <param name="page">Page index (default 1).</param>
    /// <param name="pageSize">Items per page (default 20).</param>
    /// <param name="handler">Query handler for document retrieval.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Paginated list of user documents.</response>
    [HttpGet]
    [ProducesResponseType(
        typeof(ApiResponse<PagedResultDto<DocumentSummaryDto>>),
        StatusCodes.Status200OK
    )]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromServices]
            IQueryHandler<GetDocumentsQuery, PagedResultDto<DocumentSummaryDto>> handler = default!,
        CancellationToken ct = default
    )
    {
        var query = new GetDocumentsQuery(UserId, status, page, pageSize);
        var result = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<PagedResultDto<DocumentSummaryDto>>.Ok(result));
    }

    /// <summary>
    /// 3. Create an immutable input form snapshot for the document.
    /// </summary>
    /// <param name="id">Document identifier.</param>
    /// <param name="request">Payload containing input form JSON data.</param>
    /// <param name="handler">Command handler for creating snapshot.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">The persisted input snapshot.</response>
    [HttpPost("{id:guid}/snapshots")]
    [ProducesResponseType(typeof(ApiResponse<InputSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateSnapshot(
        [FromRoute] Guid id,
        [FromBody] CreateSnapshotRequest request,
        [FromServices] ICommandHandler<CreateInputSnapshotCommand, InputSnapshotDto> handler,
        CancellationToken ct
    )
    {
        var command = new CreateInputSnapshotCommand(id, UserId, request.Data);
        var result = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<InputSnapshotDto>.Ok(result));
    }

    /// <summary>
    /// 4. Generate a new document draft version using the AI drafting service.
    /// </summary>
    /// <param name="id">Document identifier.</param>
    /// <param name="request">Draft configuration including optional SnapshotId, TemplateVersionId, and Citations.</param>
    /// <param name="handler">Command handler for draft generation.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">The generated document version details.</response>
    [HttpPost("{id:guid}/generate-draft")]
    [RequireSessionCheck]
    [ProducesResponseType(typeof(ApiResponse<DocumentVersionDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateDraft(
        [FromRoute] Guid id,
        [FromBody] GenerateDraftRequest request,
        [FromServices] ICommandHandler<GenerateDraftCommand, DocumentVersionDetailDto> handler,
        CancellationToken ct
    )
    {
        var command = new GenerateDraftCommand(
            id,
            UserId,
            request.SnapshotId,
            request.TemplateVersionId,
            request.Citations
        );
        var result = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<DocumentVersionDetailDto>.Ok(result));
    }

    /// <summary>
    /// 5. List version history for a document.
    /// </summary>
    /// <param name="id">Document identifier.</param>
    /// <param name="handler">Query handler for document versions.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">The version history of the document.</response>
    [HttpGet("{id:guid}/versions")]
    [ProducesResponseType(
        typeof(ApiResponse<IReadOnlyList<DocumentVersionSummaryDto>>),
        StatusCodes.Status200OK
    )]
    public async Task<IActionResult> GetVersions(
        [FromRoute] Guid id,
        [FromServices]
            IQueryHandler<
            GetDocumentVersionsQuery,
            IReadOnlyList<DocumentVersionSummaryDto>
        > handler,
        CancellationToken ct
    )
    {
        var query = new GetDocumentVersionsQuery(id, UserId);
        var result = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<IReadOnlyList<DocumentVersionSummaryDto>>.Ok(result));
    }

    /// <summary>
    /// 6. Get detail content, content hash, and citations of a specific document version.
    /// </summary>
    /// <param name="id">Document identifier.</param>
    /// <param name="versionId">Document version identifier.</param>
    /// <param name="handler">Query handler for version detail.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Detailed content and metadata of the version.</response>
    [HttpGet("{id:guid}/versions/{versionId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<DocumentVersionDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetVersionDetail(
        [FromRoute] Guid id,
        [FromRoute] Guid versionId,
        [FromServices]
            IQueryHandler<GetDocumentVersionDetailQuery, DocumentVersionDetailDto> handler,
        CancellationToken ct
    )
    {
        var query = new GetDocumentVersionDetailQuery(id, versionId, UserId);
        var result = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<DocumentVersionDetailDto>.Ok(result));
    }

    /// <summary>
    /// 7. Export document version to PDF or DOCX format and retrieve signed download URL.
    /// </summary>
    /// <param name="id">Document identifier.</param>
    /// <param name="versionId">Document version identifier.</param>
    /// <param name="request">Export format preferences (pdf or docx).</param>
    /// <param name="handler">Command handler for document export.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Presigned download URL and file metadata.</response>
    [HttpPost("{id:guid}/versions/{versionId:guid}/download")]
    [ProducesResponseType(typeof(ApiResponse<DownloadDocumentResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadVersion(
        [FromRoute] Guid id,
        [FromRoute] Guid versionId,
        [FromBody] DownloadDocumentRequest? request,
        [FromServices]
            ICommandHandler<DownloadDocumentVersionCommand, DownloadDocumentResultDto> handler,
        CancellationToken ct
    )
    {
        var command = new DownloadDocumentVersionCommand(id, versionId, UserId, request?.Format);
        var result = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<DownloadDocumentResultDto>.Ok(result));
    }
}
