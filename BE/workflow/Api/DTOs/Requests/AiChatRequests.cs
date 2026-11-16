using System.ComponentModel.DataAnnotations;

namespace Caps.Workflow.Api.DTOs.Requests;

public static class AiChatRequests
{
    public sealed record CreateConversationRequest([MaxLength(200)] string? Title);

    public sealed record SendChatMessageRequest(
        [Required, MaxLength(4000)] string Content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
    );

    public sealed record ClarifyChatMessageRequest(
        [Required, MaxLength(2000)] string ClarificationText,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
    );

    public sealed record TransferDraftRequest(Guid? MessageId);
}
