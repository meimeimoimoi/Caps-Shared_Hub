using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Ingestion.Dtos;
using Caps.Ingestion.DTOs.Requests;
using ingestion.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>
/// Endpoints for Knowledge Admins to approve legal documents, retry indexing, update metadata, and delete documents.
/// </summary>
[Route("api/v1/knowledge/documents")]
[ApiController]
[RequirePermission(Permission.KnowledgeManage)]
public sealed class KnowledgeDocumentController(
    IKnowledgeDocumentService docService,
    ICurrentUser currentUser
) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Approves a pending legal document and indexes its chunks into Qdrant.</summary>
    /// <remarks>Transitions status PENDING -> APPROVED -> INDEXED (or INDEX_FAILED when indexing fails).</remarks>
    /// <response code="200">The indexing outcome.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND.</response>
    /// <response code="409">DOCUMENT_NOT_PENDING or DOCUMENT_PARSE_FAILED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{id:guid}/approve"), RequireSessionCheck]
    public async Task<IActionResult> ApproveDocument(Guid id, CancellationToken cancellationToken)
    {
        var result = await docService.ApproveAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<DocumentActionResponseDto>.Ok(result));
    }

    /// <summary>Retries indexing a legal document into Qdrant when its status is INDEX_FAILED.</summary>
    /// <remarks>Enforces the configured KB_INDEX_MAX_RETRY limit before re-running chunk-and-embed.</remarks>
    /// <response code="200">The retry indexing outcome.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND.</response>
    /// <response code="409">DOCUMENT_NOT_INDEX_FAILED or INDEX_RETRY_EXCEEDED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{id:guid}/retry-index"), RequireSessionCheck]
    public async Task<IActionResult> RetryIndex(Guid id, CancellationToken cancellationToken)
    {
        var result = await docService.RetryIndexAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<DocumentActionResponseDto>.Ok(result));
    }

    /// <summary>Updates validity dates or lifecycle status and synchronizes Qdrant vector metadata.</summary>
    /// <remarks>
    /// Allows partial updates of effectiveFrom, effectiveTo (or clearEffectiveTo = true), and lifecycle status
    /// (INDEXED, EXPIRED, REVOKED, ARCHIVED). When indexed vectors exist, synchronizes payload in ai-service.
    /// </remarks>
    /// <response code="200">The updated document status and synchronized vector count.</response>
    /// <response code="400">METADATA_UPDATE_EMPTY, INVALID_DOCUMENT_STATUS, or INVALID_EFFECTIVE_PERIOD.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND.</response>
    /// <response code="409">DOCUMENT_NOT_INDEXED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE or AI_SERVICE_UNAVAILABLE.</response>
    [HttpPatch("{id:guid}/metadata"), RequireSessionCheck]
    public async Task<IActionResult> UpdateMetadata(
        Guid id,
        UpdateDocumentMetadataRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await docService.UpdateMetadataAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DocumentActionResponseDto>.Ok(result));
    }

    /// <summary>Deletes a knowledge document along with its Qdrant vectors, DB chunks, and stored file.</summary>
    /// <remarks>Deletes Qdrant points via ai-service when indexed vectors may exist, removes S3 file best-effort, then deletes DB rows.</remarks>
    /// <response code="200">Deletion summary including deleted vector count.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE or AI_SERVICE_UNAVAILABLE.</response>
    [HttpDelete("{id:guid}"), RequireSessionCheck]
    public async Task<IActionResult> DeleteDocument(Guid id, CancellationToken cancellationToken)
    {
        var result = await docService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<DeleteDocumentResponseDto>.Ok(result));
    }
}
