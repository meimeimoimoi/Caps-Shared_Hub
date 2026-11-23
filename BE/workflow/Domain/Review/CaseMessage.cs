using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>The two parties who can talk in a review case.</summary>
public static class CaseParticipant
{
    public const string Client = "CLIENT";
    public const string Expert = "EXPERT";
}

/// <summary>A text message between the requester and the expert of a review case.</summary>
public sealed class CaseMessage
{
    public const int MaxLength = 4000;

    private CaseMessage() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; private set; }
    public Guid SenderUserId { get; private set; }
    public string SenderRole { get; private set; } = default!;
    public string Content { get; private set; } = default!;
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Posts a message from a party of an open case.</summary>
    public static CaseMessage Post(
        ReviewCase reviewCase,
        Guid senderUserId,
        string? content,
        DateTimeOffset now
    )
    {
        var role = reviewCase.ParticipantRoleOf(senderUserId);
        reviewCase.EnsureChatOpen();
        var text = content?.Trim() ?? "";
        if (text.Length == 0)
            throw WorkflowErrors.MessageEmpty();
        if (text.Length > MaxLength)
            throw WorkflowErrors.MessageTooLong(MaxLength);
        return new CaseMessage
        {
            ReviewCaseId = reviewCase.Id,
            SenderUserId = senderUserId,
            SenderRole = role,
            Content = text,
            CreatedAt = now,
        };
    }
}
