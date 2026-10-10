using Caps.Common.Database;

namespace workflow.Entities.Workspace;

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
