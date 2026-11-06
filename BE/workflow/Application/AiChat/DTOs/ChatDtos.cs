using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.AiChat.DTOs;
public class ChatDtos
{
    public sealed record ConversationsSummaryDto(
        Guid iD,
        string title,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
        );

    public sealed record ConversationDetailDto(
        Guid Id,
        string title,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
        );

    public sealed record CitationDto(
        string DocNumber,
        string DocTitle,
        string? Article,
        string? Clause,
        string?  Point,
        string? Text,
        DateOnly? EffectiveFrom,
        DateOnly? EffectiveTo
        );

    public sealed record ChatMessageDto(
        Guid Id,
        Guid CoversationId,
        string Sender,
        string content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        string? ScopeResult,
        string? AnswerStatus,
        IReadOnlyList<CitationDto> Citations,
        DateTimeOffset CreatedAt
        );

    public sealed record SendChatMessageResultDto(
        ChatMessageDto UserMessageDto,
        ChatMessageDto AiMessageDto,
        int RemainingQuota
        );

    public sealed record TransferDraftResponseDto(
        Guid ConversationId,
        Guid SourceMessageId,
        string SuggestedTitle,
        DateOnly?  PeriodStart,
        IReadOnlyList<CitationDto> Citations,
        string InitialDataJson
        );
}
