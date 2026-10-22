using Caps.Workflow.Application.Features.CaseChat;

namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>A text message of 1–4000 characters (leading and trailing spaces are trimmed).</summary>
public sealed record SendCaseMessageRequest(string? Content)
{
    public SendCaseMessageCommand ToCommand(Guid userId, Guid reviewCaseId) =>
        new(userId, reviewCaseId, Content);
}

/// <summary>The newest message the caller has seen in the case.</summary>
public sealed record MarkCaseMessagesReadRequest(Guid LastMessageId)
{
    public MarkCaseMessagesReadCommand ToCommand(Guid userId, Guid reviewCaseId) =>
        new(userId, reviewCaseId, LastMessageId);
}
