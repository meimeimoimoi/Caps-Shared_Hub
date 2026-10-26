using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.CaseChat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// Text chat between the requester (client) and the expert of a review case. Only the two parties of the
/// case can read or write; to anyone else the case does not exist. Clients poll with the <c>after</c> cursor.
/// </summary>
[ApiController, Authorize, Route("api/v1/review-cases")]
public sealed class ReviewCaseMessagesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns a page of the case's messages, oldest first.</summary>
    /// <remarks>
    /// Without cursors: the newest messages. <c>before</c>: older messages (scrolling back).
    /// <c>after</c>: messages newer than the given one (polling). <c>limit</c> defaults to 30, at most 100.
    /// </remarks>
    /// <response code="200">The messages (may be empty).</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party) or MESSAGE_NOT_FOUND (cursor).</response>
    [HttpGet("{caseId:guid}/messages")]
    public async Task<IActionResult> List(
        Guid caseId,
        [FromQuery] Guid? before,
        [FromQuery] Guid? after,
        [FromQuery] int? limit,
        [FromServices] IQueryHandler<ListCaseMessagesQuery, CaseMessageResponse[]> handler,
        CancellationToken ct
    )
    {
        var page = await handler.HandleAsync(new(UserId, caseId, before, after, limit), ct);
        return Ok(ApiResponse<CaseMessageResponse[]>.Ok(page));
    }

    /// <summary>Sends a text message to the other party of the case.</summary>
    /// <response code="200">The stored message.</response>
    /// <response code="400">MESSAGE_EMPTY or MESSAGE_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party).</response>
    /// <response code="409">CHAT_CLOSED: the expert has not accepted yet, or the case has ended.</response>
    [HttpPost("{caseId:guid}/messages")]
    public async Task<IActionResult> Send(
        Guid caseId,
        SendCaseMessageRequest r,
        [FromServices] ICommandHandler<SendCaseMessageCommand, CaseMessageResponse> handler,
        CancellationToken ct
    )
    {
        var message = await handler.HandleAsync(r.ToCommand(UserId, caseId), ct);
        return Ok(ApiResponse<CaseMessageResponse>.Ok(message));
    }

    /// <summary>Marks the case's messages as read up to the given one.</summary>
    /// <remarks>An older message than the current marker is ignored, so the marker never moves back.</remarks>
    /// <response code="200">Marker saved.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or MESSAGE_NOT_FOUND.</response>
    [HttpPost("{caseId:guid}/messages/read")]
    public async Task<IActionResult> MarkRead(
        Guid caseId,
        MarkCaseMessagesReadRequest r,
        [FromServices] ICommandHandler<MarkCaseMessagesReadCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(r.ToCommand(UserId, caseId), ct);
        return Ok(ApiResponse.Message("Messages marked as read."));
    }

    /// <summary>Returns the number of unread messages per case the caller takes part in.</summary>
    /// <remarks>Cases without unread messages are left out.</remarks>
    /// <response code="200">The counts (may be empty).</response>
    [HttpGet("messages/unread")]
    public async Task<IActionResult> Unread(
        [FromServices] IQueryHandler<GetUnreadCaseMessagesQuery, CaseUnreadResponse[]> handler,
        CancellationToken ct
    )
    {
        var counts = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<CaseUnreadResponse[]>.Ok(counts));
    }
}
