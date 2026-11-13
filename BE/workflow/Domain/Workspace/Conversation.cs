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

    private readonly List<ChatMessage> _messages = [];
    public IReadOnlyCollection<ChatMessage> Messages => _messages.AsReadOnly();

    public static Conversation Create(Guid userId, string? title, DateTimeOffset now)
    {
        var cleanTitle = string.IsNullOrWhiteSpace(title) ? "New Conversation" : title.Trim();

        return new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = cleanTitle,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    public void UpdateTitle(string titile, DateTimeOffset now)
    {
        if (!string.IsNullOrWhiteSpace(titile))
        {
            Title = titile.Trim();
            UpdatedAt = now;
        }
    }

    public void Touch(DateTimeOffset now)
    {
        UpdatedAt = now;
    }
}
