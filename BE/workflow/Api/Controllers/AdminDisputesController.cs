using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Attachments;
using Caps.Workflow.Application.Features.Disputes;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// System admins decide clients' disputes about deliveries: the open queue, a decision with the client's refund
/// share, and one extension of the 48-hour decision window.
/// </summary>
[ApiController, RequirePermission(Permission.DisputeResolve)]
[Route("api/v1/admin/review-cases")]
public sealed class AdminDisputesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the open disputes, earliest decision deadline first.</summary>
    /// <response code="200">The open disputes (may be empty); overdue ones are flagged.</response>
    /// <response code="403">Missing the DisputeResolve permission.</response>
    [HttpGet("disputes")]
    public async Task<IActionResult> ListOpen(
        [FromServices] IQueryHandler<ListOpenDisputesQuery, AdminDisputeResponse[]> handler,
        CancellationToken ct
    )
    {
        var queue = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<AdminDisputeResponse[]>.Ok(queue));
    }

    /// <summary>Decides the dispute and settles the case.</summary>
    /// <remarks>The client gets refundPct of the fee; the rest splits by the platform fee frozen at booking.</remarks>
    /// <response code="200">The dispute, RESOLVED; the case is RESOLVED.</response>
    /// <response code="400">DISPUTE_REFUND_INVALID or TEXT_REQUIRED.</response>
    /// <response code="403">Missing the DisputeResolve permission.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or DISPUTE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID: the dispute is already closed.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/dispute/decision"), RequireSessionCheck]
    public async Task<IActionResult> Resolve(
        Guid caseId,
        ResolveDisputeRequest r,
        [FromServices] ICommandHandler<ResolveDisputeCommand, DisputeResponse> handler,
        CancellationToken ct
    )
    {
        var dispute = await handler.HandleAsync(new(UserId, caseId, r.RefundPct, r.Note), ct);
        return Ok(ApiResponse<DisputeResponse>.Ok(dispute));
    }

    /// <summary>Gives the admin one more 48-hour decision window.</summary>
    /// <response code="200">The dispute with the later deadline.</response>
    /// <response code="403">Missing the DisputeResolve permission.</response>
    /// <response code="404">DISPUTE_NOT_FOUND.</response>
    /// <response code="409">DISPUTE_ALREADY_EXTENDED or CASE_STATUS_INVALID (closed).</response>
    [HttpPost("{caseId:guid}/dispute/extend")]
    public async Task<IActionResult> Extend(
        Guid caseId,
        [FromServices] ICommandHandler<ExtendDisputeCommand, DisputeResponse> handler,
        CancellationToken ct
    )
    {
        var dispute = await handler.HandleAsync(new(caseId), ct);
        return Ok(ApiResponse<DisputeResponse>.Ok(dispute));
    }

    /// <summary>Returns the case's files, to weigh a dispute.</summary>
    /// <response code="200">The files (may be empty).</response>
    /// <response code="403">Missing the DisputeResolve permission.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    [HttpGet("{caseId:guid}/attachments")]
    public async Task<IActionResult> ListAttachments(
        Guid caseId,
        [FromServices] IQueryHandler<ListAttachmentsQuery, AttachmentResponse[]> handler,
        CancellationToken ct
    )
    {
        var files = await handler.HandleAsync(new(null, caseId), ct);
        return Ok(ApiResponse<AttachmentResponse[]>.Ok(files));
    }

    /// <summary>Downloads one of the case's files.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="403">Missing the DisputeResolve permission.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or ATTACHMENT_NOT_FOUND.</response>
    [HttpGet("{caseId:guid}/attachments/{attachmentId:guid}/file")]
    public async Task<IActionResult> OpenAttachment(
        Guid caseId,
        Guid attachmentId,
        [FromServices] IQueryHandler<OpenAttachmentQuery, AttachmentFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(null, caseId, attachmentId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }
}
