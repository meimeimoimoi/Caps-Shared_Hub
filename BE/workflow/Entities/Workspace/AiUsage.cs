using Caps.Common.Database;

namespace workflow.Entities.Workspace;

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
}
