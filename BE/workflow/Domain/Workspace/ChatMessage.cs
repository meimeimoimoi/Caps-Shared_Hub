using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

public static class ChatMessageSender
{
    public const string User = "USER";
    public const string AI = "AI";
}

public static class  ChatMessageAnswerStatus
{
    public const string Answered = "ANSWERED";
    public const string NeedClarification = "NEED_CLARIFICATION";
    public const string Rejected = "REJECTED";
}

public static class  ChatMessageScopeResult
{
    public const string InScope = "IN_SCOPE";
    public const string OutOfScope = "OUT_OF_SCOPE";
    public const string Ambiguous = "AMBIGUOUS";
}
/// <summary>A question or AI answer in a conversation, with the legal period it covers and its citations.</summary>
public sealed class ChatMessage
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = default!;

    public string Sender { get; set; } = default!;
    public string Content { get; set; } = default!;
    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    public string? ScopeResult { get; set; }
    public string? AnswerStatus { get; set; }
    public string? Citations { get; set; } // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    private ChatMessage() { }

    public static ChatMessage CreateUserMessage(
        Guid convesastionId,
        string content,
        DateOnly? periodStart,
        DateOnly? periodEnd,
        DateTimeOffset now)
    {
        return new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = convesastionId,
            Sender = ChatMessageSender.User,
            Content = content,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            ScopeResult = null,
            Citations = null,
            CreatedAt = now
        };
    }

    public static ChatMessage CreateAiMessage(
        Guid converstationId,
        string content,
        string scopeResult,
        string answerStatus,
        DateOnly? periodStart,
        DateOnly? periodEnd,
        string? citations,
        DateTimeOffset now)
    {
        return new ChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = converstationId,
            Sender = ChatMessageSender.AI,
            Content = content,
            ScopeResult = scopeResult,
            AnswerStatus = answerStatus,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            Citations = citations,
            CreatedAt = now
        };
    }
}
