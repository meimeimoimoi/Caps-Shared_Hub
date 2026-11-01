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
    public sealed record CreateConversationRequest(string? Title);

    public sealed record ConversationDto(
        Guid Id,
        string? Title,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
    );

    public sealed record SendMessageRequest(
        [Required] string Content,
        string? UserTaxPeriod = null
    );

    public sealed record ClarifyMessageRequest(
        [Required] string ClarificationAnswer
    );

    public sealed record ChatMessageDto(
        Guid Id,
        Guid ConversationId,
        string Sender,
        string Content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        string? ScopeResult,
        string? AnswerStatus,
        JsonNode? Citations,
        DateTimeOffset CreatedAt
    );

    public sealed record CitationDetailDto(
        string? Article,
        string? Clause,
        string? Point,
        string? DocNumber,
        string? Text,
        string? EffectiveFrom,
        string? EffectiveTo
    );

    public sealed record PagedResult<T>(
        IReadOnlyList<T> Items,
        int Page,
        int PageSize,
        int TotalCount
    );
}
