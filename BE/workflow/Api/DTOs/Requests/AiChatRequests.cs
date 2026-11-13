using System.ComponentModel.DataAnnotations;

namespace Caps.Workflow.Api.DTOs.Requests;

public static class AiChatRequests
{
    public sealed record CreateConversationRequest(string? Title);

    public sealed record SendChatMessageRequest(
        [Required] string Content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
    );

    public sealed record ClarifyChatMessageRequest(
        [Required] string ClarificationText,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
    );

    public sealed record TransferDraftRequest(Guid? MessageId);
}
