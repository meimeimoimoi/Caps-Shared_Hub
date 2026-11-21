namespace Caps.Workflow.Domain.Review;

// Extension (2026-11-20): only the client's yes moves the delivery deadline, so the client never bears the delay
public sealed partial class ReviewCase
{
    public const int MaxExtensionDays = 2;
    public const string ExtensionAccepted = "EXTENSION_ACCEPTED";
    public const string ExtensionDeclined = "EXTENSION_DECLINED";

    /// <summary>The expert asked and the client has not answered yet.</summary>
    public bool ExtensionPending => ExtensionRequestedAt != null && ExtensionDecision == null;

    /// <summary>
    /// The expert asks once per case, before the delivery deadline, for 1 to MaxExtensionDays more working days.
    /// Nothing moves until the client accepts; without an answer the deadline stays.
    /// </summary>
    public void RequestExtension(Guid expertProfileId, int days, string? reason, DateTimeOffset now)
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.InReview, DeliveryDeadline, now);
        if (ExtensionRequestedAt != null)
        {
            throw WorkflowErrors.ExtensionAlreadyRequested();
        }
        if (days is < 1 or > MaxExtensionDays)
        {
            throw WorkflowErrors.ExtensionDaysInvalid(MaxExtensionDays);
        }
        ExtensionReason = RequiredText(reason, "Reason");
        ExtensionDays = (short)days;
        ExtensionRequestedAt = now;
        UpdatedAt = now;
    }

    /// <summary>
    /// The client accepts or declines before the delivery deadline. Accepting adds the days to the deadline as it
    /// stands now (an answered question may have moved it), so the late window and auto-cancel follow.
    /// </summary>
    public void DecideExtension(
        Guid requesterUserId,
        bool accept,
        DateTimeOffset now,
        WorkCalendar? calendar = null
    )
    {
        EnsureRequester(requesterUserId);
        if (!ExtensionPending)
        {
            throw WorkflowErrors.ExtensionNotPending();
        }
        EnsureStep(ReviewCaseStatus.InReview, DeliveryDeadline, now);
        if (accept)
        {
            DeliveryDeadline = (calendar ?? WorkCalendar.WeekendsOnly).AddWorkingDays(
                DeliveryDeadline!.Value,
                ExtensionDays!.Value
            );
        }
        ExtensionDecision = accept ? ExtensionAccepted : ExtensionDeclined;
        ExtensionDecidedAt = now;
        UpdatedAt = now;
    }
}
