using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Application.Features.AiChat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Principal;
using static Caps.Workflow.Api.DTOs.Requests.AiChatRequests;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;
using static Caps.Workflow.Application.Features.AiChat.ClarifyChatMessage;
using static Caps.Workflow.Application.Features.AiChat.CreateConversation;
using static Caps.Workflow.Application.Features.AiChat.GetConversationMessages;
using static Caps.Workflow.Application.Features.AiChat.GetMessageCitations;
using static Caps.Workflow.Application.Features.AiChat.ListConversations;
using static Caps.Workflow.Application.Features.AiChat.SendChatMessage;
using static Caps.Workflow.Application.Features.AiChat.TransferConversationDraft;

namespace Caps.Workflow.Api.Controllers;
[Route("api/v1/chat")]
[ApiController]
[RequirePermission(Permission.UserManage)]
public sealed class ChatController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    ///<summary>
    /// 1. Create a new chat session (conversation).
    /// </summary>
    [HttpPost("conversations")]
    [ProducesResponseType(typeof(ApiResponse<ConversationDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateConversation(
        [FromBody] CreateConvesationRequest request,
        [FromServices] ICommandHandler<CreateConverstaionCommand, ConversationDetailDto> handler, CancellationToken ct)
    {
        var command = new CreateConverstaionCommand(UserId, request.Title);
        var session = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<ConversationDetailDto>.Ok(session));
    }

    ///<summary>
    /// 2. List chat history of current user ordered by updated time descending.
    /// </summary>
    [HttpGet("conversation")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ConversationsSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListConversations(
        [FromServices] IQueryHandler<ListConversationsQuery, IReadOnlyList<ConversationsSummaryDto>> handler, CancellationToken ct)
    {
        var query = new ListConversationsQuery(UserId);
        var conversations = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<IReadOnlyList<ConversationsSummaryDto>>.Ok(conversations));
    }

    ///<summary>
    /// 3. Get message hisitory of convesation session 
    /// </summary>
    [HttpGet("conversations/{id:guid}/messages")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<ChatMessageDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversationMessages(
        [FromRoute] Guid id,
        [FromServices] IQueryHandler<GetConversationMessagesQuery, IReadOnlyList<ChatMessageDto>> handler, CancellationToken ct)
    {
        var query = new GetConversationMessagesQuery(id, UserId);
        var messages = await handler.HandleAsync(query, ct);
        return Ok(ApiResponse<IReadOnlyList<ChatMessageDto>>.Ok(messages));
    }

    /// <summary>
    /// 4. Send question to chatbot (checks AI quota, calls RAG query, records usage, and responds).
    /// </summary>
    [HttpPost("conversations/{id:guid}/messages")]
    [ProducesResponseType(typeof(ApiResponse<SendChatMessageResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendChatMessage(
        [FromRoute] Guid id,
        [FromBody] SendChatMessageRequest request,
        [FromServices] ICommandHandler<SendChatMessageCommand, SendChatMessageResultDto> handler, CancellationToken ct)
    {
        var command = new SendChatMessageCommand(
            id,
            UserId,
            request.Content,
            request.PeriodStart,
            request.PerodEnd);

        var result = await handler.HandleAsync(command, ct);
        return Ok(ApiResponse<SendChatMessageResultDto>.Ok(result));
    }

    /// <summary>
    /// 5. Clarify previous AI answer requiring additional information (tax period, transaction date, or scope).
    /// </summary>
    [HttpPost("messages/{id:guid}/clarify")]
    [ProducesResponseType(typeof(ApiResponse<SendChatMessageResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ClarifyMessage(
        [FromRoute] Guid id,
        [FromBody] ClarifyChatMessageRequest request,
        [FromServices] ICommandHandler<ClarifyChatMessageCommand, SendChatMessageResultDto> handler, CancellationToken ct)
    {
        var command = new ClarifyChatMessageCommand(
            id,
            UserId,
            request.ClarificationText,
            request.PerodStart,
            request.PerodEnd);

        var result = await handler.HandleAsync(command, ct);
        return Ok(ApiResponse<SendChatMessageResultDto>.Ok(result));
    }

    /// <summary>
    /// 6. View detailed legal citations referenced by a chat message.
    /// </summary>
    [HttpGet("messages/{id:guid}/citations")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CitationDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessageCitations(
        [FromRoute] Guid id,
        [FromServices] ICommandHandler<GetMessageCitationsQuery, IReadOnlyList<CitationDto>> handler, CancellationToken ct)
    {
        var query = new GetMessageCitationsQuery(id, UserId);
        var citations = await handler.HandleAsync(query, ct);
        return Ok(ApiResponse<IReadOnlyList<CitationDto>>.Ok(citations));
    }

    /// <summary>
    /// 7. Transfer conversation context and citations into draft form initialization data.
    /// </summary>
    [HttpPost("conversations/{id:guid}/transder-draft")]
    [ProducesResponseType(typeof(ApiResponse<TransferDraftResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TransferDraft(
        [FromRoute] Guid id,
        [FromBody] TransferDraftRequest? request,
        [FromServices] ICommandHandler<TransferConversationDraftCommand, TransferDraftResponseDto> handler, CancellationToken ct)
    {
        var command = new TransferConversationDraftCommand(id, UserId, request?.MessgaeId);
        var draftContext = await handler.HandleAsync(command, ct);
        return Ok(ApiResponse<TransferDraftResponseDto>.Ok(draftContext));
    }
}
