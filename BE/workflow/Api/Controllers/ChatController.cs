using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;
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

/// <summary>
/// Endpoints for user AI legal chat conversations, message history, citations, and draft transfer.
/// </summary>
[Route("api/v1/chat")]
[ApiController]
[RequirePermission(Permission.BusinessRead)]
public sealed class ChatController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Creates a new AI chat conversation for the current user.</summary>
    /// <remarks>Initializes a conversation workspace with an optional custom title.</remarks>
    /// <response code="200">The newly created conversation.</response>
    [HttpPost("conversations")]
    [ProducesResponseType(typeof(ApiResponse<ConversationDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateConversation(
        [FromBody] CreateConversationRequest request,
        [FromServices] ICommandHandler<CreateConversationCommand, ConversationDetailDto> handler,
        CancellationToken ct
    )
    {
        var command = new CreateConversationCommand(UserId, request.Title);
        var session = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<ConversationDetailDto>.Ok(session));
    }

    /// <summary>Lists the current user's AI chat conversations ordered by most recently updated.</summary>
    /// <remarks>Returns conversation summaries for the sidebar history.</remarks>
    /// <response code="200">The user's conversation list.</response>
    [HttpGet("conversations")]
    [ProducesResponseType(
        typeof(ApiResponse<IReadOnlyList<ConversationsSummaryDto>>),
        StatusCodes.Status200OK
    )]
    public async Task<IActionResult> ListConversations(
        [FromServices]
            IQueryHandler<ListConversationsQuery, IReadOnlyList<ConversationsSummaryDto>> handler,
        CancellationToken ct
    )
    {
        var query = new ListConversationsQuery(UserId);
        var conversations = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<IReadOnlyList<ConversationsSummaryDto>>.Ok(conversations));
    }

    /// <summary>Loads the chronological message history of a conversation.</summary>
    /// <remarks>Uses index <c>(conversation_id, created_at)</c> to return messages in ascending order.</remarks>
    /// <response code="200">The messages in the conversation.</response>
    /// <response code="403">The conversation belongs to another user.</response>
    /// <response code="404">Conversation not found.</response>
    [HttpGet("conversations/{id:guid}/messages")]
    [ProducesResponseType(
        typeof(ApiResponse<IReadOnlyList<ChatMessageDto>>),
        StatusCodes.Status200OK
    )]
    public async Task<IActionResult> GetConversationMessages(
        [FromRoute] Guid id,
        [FromServices]
            IQueryHandler<GetConversationMessagesQuery, IReadOnlyList<ChatMessageDto>> handler,
        CancellationToken ct
    )
    {
        var query = new GetConversationMessagesQuery(id, UserId);
        var messages = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<IReadOnlyList<ChatMessageDto>>.Ok(messages));
    }

    /// <summary>Sends a question in a conversation and returns the AI response with legal citations.</summary>
    /// <remarks>Verifies AI quota, queries the RAG service for scope and tax period checks, and records usage.</remarks>
    /// <response code="200">The persisted user message, AI answer, and remaining quota.</response>
    /// <response code="403">The conversation belongs to another user.</response>
    /// <response code="404">Conversation not found.</response>
    [HttpPost("conversations/{id:guid}/messages")]
    [RequireSessionCheck]
    [ProducesResponseType(typeof(ApiResponse<SendChatMessageResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendChatMessage(
        [FromRoute] Guid id,
        [FromBody] SendChatMessageRequest request,
        [FromServices] ICommandHandler<SendChatMessageCommand, SendChatMessageResultDto> handler,
        CancellationToken ct
    )
    {
        var command = new SendChatMessageCommand(
            id,
            UserId,
            request.Content,
            request.PeriodStart,
            request.PeriodEnd
        );
        var result = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<SendChatMessageResultDto>.Ok(result));
    }

    /// <summary>Submits a clarification response for an AI message that requested more context.</summary>
    /// <remarks>Provides additional tax period or transaction date details to complete the RAG query.</remarks>
    /// <response code="200">The clarification message, new AI answer, and remaining quota.</response>
    /// <response code="400">The target message is not an AI message awaiting clarification.</response>
    /// <response code="404">Target message or conversation not found.</response>
    [HttpPost("messages/{id:guid}/clarify")]
    [RequireSessionCheck]
    [ProducesResponseType(typeof(ApiResponse<SendChatMessageResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ClarifyMessage(
        [FromRoute] Guid id,
        [FromBody] ClarifyChatMessageRequest request,
        [FromServices] ICommandHandler<ClarifyChatMessageCommand, SendChatMessageResultDto> handler,
        CancellationToken ct
    )
    {
        var command = new ClarifyChatMessageCommand(
            id,
            UserId,
            request.ClarificationText,
            request.PeriodStart,
            request.PeriodEnd
        );
        var result = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<SendChatMessageResultDto>.Ok(result));
    }

    /// <summary>Returns detailed legal citations referenced by a specific chat message.</summary>
    /// <remarks>Includes document number, title, article, clause, point, and effective dates.</remarks>
    /// <response code="200">The citations attached to the message.</response>
    /// <response code="404">Message or conversation not found.</response>
    [HttpGet("messages/{id:guid}/citations")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CitationDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessageCitations(
        [FromRoute] Guid id,
        [FromServices] IQueryHandler<GetMessageCitationsQuery, IReadOnlyList<CitationDto>> handler,
        CancellationToken ct
    )
    {
        var query = new GetMessageCitationsQuery(id, UserId);
        var citations = await handler.HandleAsync(query, ct);

        return Ok(ApiResponse<IReadOnlyList<CitationDto>>.Ok(citations));
    }

    /// <summary>Extracts conversation context and citations to prefill a new document draft form.</summary>
    /// <remarks>Uses the specified AI message or the latest answered AI message in the conversation.</remarks>
    /// <response code="200">Draft initialization payload with extracted facts and citations.</response>
    /// <response code="404">Conversation or answerable message not found.</response>
    [HttpPost("conversations/{id:guid}/transfer-draft")]
    [ProducesResponseType(typeof(ApiResponse<TransferDraftResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TransferDraft(
        [FromRoute] Guid id,
        [FromBody] TransferDraftRequest? request,
        [FromServices]
            ICommandHandler<TransferConversationDraftCommand, TransferDraftResponseDto> handler,
        CancellationToken ct
    )
    {
        var command = new TransferConversationDraftCommand(id, UserId, request?.MessageId);
        var draftContext = await handler.HandleAsync(command, ct);

        return Ok(ApiResponse<TransferDraftResponseDto>.Ok(draftContext));
    }
}
