namespace Caps.Workflow.Domain.Review;

// Files the parties add to a case
public sealed partial class ReviewCase
{
    /// <summary>
    /// A party adds a file while the review runs or a dispute is open; the caller stores the bytes under the
    /// attachment's FileUrl. To anyone else the case does not exist. The same file twice (same name and size) is
    /// refused, so a double click or a second drop does not fill the uploader's limit.
    /// </summary>
    /// <param name="existing">The files the case already holds.</param>
    public ReviewAttachment AddAttachment(
        Guid userId,
        string? fileName,
        byte[] content,
        IReadOnlyCollection<ReviewAttachment> existing,
        DateTimeOffset now,
        ReviewDispute? dispute = null
    )
    {
        ParticipantRoleOf(userId);
        // Evidence closes with the statement window for both parties, so neither answers after the other
        if (dispute?.EvidenceOpen(now) == false)
        {
            throw WorkflowErrors.DisputeEvidenceClosed();
        }
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
        if (existing.Count(x => x.UploadedBy == userId) >= ReviewAttachment.MaxPerParty)
        {
            throw WorkflowErrors.AttachmentLimit(ReviewAttachment.MaxPerParty);
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

    /// <summary>Minutes after upload during which the uploader can take a file back.</summary>
    public const int AttachmentRemoveMinutes = 15;

    /// <summary>
    /// The uploader takes back a file sent by mistake: the expert any time before delivery, otherwise within
    /// AttachmentRemoveMinutes of uploading; never another party's file, during a dispute or once the case is closed.
    /// </summary>
    public void EnsureAttachmentRemovable(
        Guid userId,
        ReviewAttachment attachment,
        DateTimeOffset now
    )
    {
        var role = ParticipantRoleOf(userId);
        var open =
            Status
            is ReviewCaseStatus.InReview
                or ReviewCaseStatus.AwaitingUserInformation
                or ReviewCaseStatus.AwaitingAcceptance;
        // The expert's working files stay theirs until delivery; otherwise only a quick undo after uploading
        var expertBeforeDelivery =
            role == CaseParticipant.Expert
            && Status is (ReviewCaseStatus.InReview or ReviewCaseStatus.AwaitingUserInformation);
        var justUploaded = now <= attachment.UploadedAt.AddMinutes(AttachmentRemoveMinutes);
        if (attachment.UploadedBy != userId || !open || !(expertBeforeDelivery || justUploaded))
        {
            throw WorkflowErrors.AttachmentNotRemovable(AttachmentRemoveMinutes);
        }
    }
}
