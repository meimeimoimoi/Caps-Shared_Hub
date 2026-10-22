using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>One message of a review case.</summary>
/// <param name="SenderRole">CLIENT or EXPERT.</param>
public sealed record CaseMessageResponse(
    string Id,
    string SenderUserId,
    string SenderRole,
    string Content,
    DateTimeOffset CreatedAt
)
{
    public static CaseMessageResponse From(CaseMessage m) =>
        new(m.Id.ToString(), m.SenderUserId.ToString(), m.SenderRole, m.Content, m.CreatedAt);
}

/// <summary>Messages the signed-in user has not read yet in one case.</summary>
public sealed record CaseUnreadResponse(string ReviewCaseId, int UnreadCount);
