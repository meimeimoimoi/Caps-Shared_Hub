namespace Caps.Workflow.Application.AiChat.DTOs;

/// <summary>Data transfer objects for AI legal chat conversations, messages, citations, and draft transfer.</summary>
public static class ChatDtos
{
    /// <summary>Summary of a user's AI chat conversation for history listing.</summary>
    public sealed record ConversationsSummaryDto(
        Guid Id,
        string Title,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
    );

    /// <summary>Details of a newly created or retrieved AI chat conversation.</summary>
    public sealed record ConversationDetailDto(
        Guid Id,
        string Title,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
    );

    /// <summary>Legal citation referenced in an AI chat answer.</summary>
    public sealed record CitationDto(
        string DocNumber,
        string DocTitle,
        string? Article,
        string? Clause,
        string? Point,
        string? Text,
        DateOnly? EffectiveFrom,
        DateOnly? EffectiveTo
    );

    /// <summary>A single user or AI message in a conversation.</summary>
    public sealed record ChatMessageDto(
        Guid Id,
        Guid ConversationId,
        string Sender,
        string Content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        string? ScopeResult,
        string? AnswerStatus,
        IReadOnlyList<CitationDto>? Citations,
        DateTimeOffset CreatedAt
    );

    /// <summary>Result of sending or clarifying a chat message, including the user prompt, AI reply, and remaining quota.</summary>
    public sealed record SendChatMessageResultDto(
        ChatMessageDto UserMessageDto,
        ChatMessageDto AiMessageDto,
        int RemainingQuota
    );

    /// <summary>Context payload extracted from an AI chat conversation to initialize a document draft.</summary>
    public sealed record TransferDraftResponseDto(
        Guid ConversationId,
        Guid SourceMessageId,
        string SuggestedTitle,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        IReadOnlyList<CitationDto> Citations,
        string InitialDataJson
    );
}
