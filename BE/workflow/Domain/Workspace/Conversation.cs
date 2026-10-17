using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>A user's AI chat thread.</summary>
public sealed class Conversation
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public string? Title { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ChatMessage> Messages { get; set; } = [];
}
