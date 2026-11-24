namespace Caps.Workflow.Domain.Review;

// Files the parties add to a case
public sealed partial class ReviewCase
{
    /// <summary>
    /// A party adds a file while the review runs or a dispute is open; the caller stores the bytes under the
    /// attachment's FileUrl. To anyone else the case does not exist. The same file twice (same name and size) is
    /// refused, so a double click or a second drop does not fill the per-case limit.
    /// </summary>
    /// <param name="existing">The files the case already holds.</param>
    public ReviewAttachment AddAttachment(
        Guid userId,
        string? fileName,
        byte[] content,
        IReadOnlyCollection<ReviewAttachment> existing,
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
        if (existing.Count >= ReviewAttachment.MaxPerCase)
        {
            throw WorkflowErrors.AttachmentLimit(ReviewAttachment.MaxPerCase);
        }
        var attachment = ReviewAttachment.Create(Id, userId, fileName, content, now);
        // ponytail: name + size, no content hash stored; hash the bytes if renamed copies must be caught too
        if (
            existing.Any(x =>
                x.FileName == attachment.FileName && x.SizeBytes == attachment.SizeBytes
            )
        )
        {
            throw WorkflowErrors.AttachmentDuplicate(attachment.FileName);
        }
        return attachment;
    }
}
