namespace Caps.Workflow.Domain.Review;

/// <summary>The last message a party of a review case has read; messages after it count as unread.</summary>
public sealed class CaseReadMarker
{
    private CaseReadMarker() { }

    public Guid ReviewCaseId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid LastReadMessageId { get; private set; }
    public DateTimeOffset LastReadAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Starts the marker at the given message.</summary>
    public static CaseReadMarker Start(
        Guid reviewCaseId,
        Guid userId,
        CaseMessage message,
        DateTimeOffset now
    ) =>
        new()
        {
            ReviewCaseId = reviewCaseId,
            UserId = userId,
            LastReadMessageId = message.Id,
            LastReadAt = message.CreatedAt,
            UpdatedAt = now,
        };

    /// <summary>Moves the marker to a later message; an older one (a stale client) is ignored.</summary>
    public void MoveTo(CaseMessage message, DateTimeOffset now)
    {
        if (message.CreatedAt <= LastReadAt)
            return;
        LastReadMessageId = message.Id;
        LastReadAt = message.CreatedAt;
        UpdatedAt = now;
    }
}
