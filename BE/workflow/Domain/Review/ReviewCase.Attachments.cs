namespace Caps.Workflow.Domain.Review;

// Files the parties add to a case
public sealed partial class ReviewCase
{
    /// <summary>
    /// A party adds a file while the review runs or a dispute is open; the caller stores the bytes under the
    /// attachment's FileUrl. To anyone else the case does not exist.
    /// </summary>
    public ReviewAttachment AddAttachment(
        Guid userId,
        string? fileName,
        byte[] content,
        int attachmentCount,
        DateTimeOffset now
    )
    {
        ParticipantRoleOf(userId);
        if (
            Status
            is not (
                ReviewCaseStatus.InReview
                or ReviewCaseStatus.AwaitingUserInformation
                or ReviewCaseStatus.AwaitingAcceptance
                or ReviewCaseStatus.Disputed
            )
        )
        {
            throw WorkflowErrors.AttachmentsClosed(Status);
        }
        if (attachmentCount >= ReviewAttachment.MaxPerCase)
        {
            throw WorkflowErrors.AttachmentLimit(ReviewAttachment.MaxPerCase);
        }
        return ReviewAttachment.Create(Id, userId, fileName, content, now);
    }
}
