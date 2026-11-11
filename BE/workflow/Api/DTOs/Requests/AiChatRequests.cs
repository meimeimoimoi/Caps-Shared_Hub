using System.ComponentModel.DataAnnotations;

namespace Caps.Workflow.Api.DTOs.Requests;

public class AiChatRequests
{
    public sealed record CreateConvesationRequest(
        string? Title);

    public sealed record SendChatMessageRequest(
        [Required] string Content,
        DateOnly? PeriodStart,
        DateOnly? PerodEnd);

    public sealed record ClarifyChatMessageRequest(
        [Required] string ClarificationText,
        DateOnly? PerodStart,
        DateOnly? PerodEnd);

    public sealed record TransferDraftRequest(
        Guid? MessgaeId);
}
