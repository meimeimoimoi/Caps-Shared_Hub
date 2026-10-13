using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

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
}
