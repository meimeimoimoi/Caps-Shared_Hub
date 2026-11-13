using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Ingestion.Dtos;
using ingestion.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>
/// Endpoints for Knowledge Admins to approve legal documents and retry Qdrant vector indexing.
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

    /// <summary>
    /// Approves a pending legal document and indexes its chunks into Qdrant (PENDING -> APPROVED -> INDEXED).
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<DocumentActionResponseDto>> ApproveDocument(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var result = await docService.ApproveAsync(id, UserId, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Retries indexing a legal document into Qdrant when its status is INDEX_FAILED.
    /// </summary>
    [HttpPost("{id:guid}/retry-index")]
    public async Task<ActionResult<DocumentActionResponseDto>> RetryIndex(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var result = await docService.RetryIndexAsync(id, UserId, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
