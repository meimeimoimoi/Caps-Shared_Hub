using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

public static class AiUsagePaidWith
{
    public const string Quota = "QUOTA";
    public const string Credit = "CREDIT";
}

public static class AiUsageState
{
    public const string Reserved = "RESERVED";
    public const string Captured = "CAPTURED";
    public const string Refunded = "REFUNDED";
}

/// <summary>One AI answer and how it was paid (free quota or held credits), reserved first and settled after.</summary>
public sealed class AiUsage
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public Guid? ConversationId { get; set; }
    public Conversation? Conversation { get; set; }
    public Guid? QuestionId { get; set; }
    public ChatMessage? Question { get; set; }
    public string PaidWith { get; set; } = default!;
    public long CreditHold { get; set; }
    public string State { get; set; } = "RESERVED";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    private AiUsage() { }

    public static AiUsage Create(
        Guid userId,
        Guid? conversationId,
        Guid? questionId,
        string paidWith,
        long creditHold,
        string state,
        DateTimeOffset now)
    {
        return new AiUsage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ConversationId = conversationId,
            QuestionId = questionId,
            PaidWith = paidWith,
            CreditHold = creditHold,
            State = state,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    public void TransitionState(string newState, DateTimeOffset now)
    {
        State = newState;
        UpdatedAt = now;
    }
}
