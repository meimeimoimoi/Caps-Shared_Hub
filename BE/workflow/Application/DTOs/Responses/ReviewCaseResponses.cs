using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A review case as its client or expert sees it.</summary>
/// <param name="Fee">Price frozen at booking, in VND.</param>
public sealed record ReviewCaseResponse(
    string Id,
    string Status,
    string? Result,
    string? ReviewSummary,
    String? CannotVerifyReason,
    string? DeclineReason,
    string DocumentId,
    string SourceVersionId,
    string ExpertProfileId,
    long Fee,
    int TurnaroundHours,
    string ProblemDescription,
    string? ExpectedOutcome,
    DateTimeOffset? PaymentDeadline,
    DateTimeOffset? ResponseDeadline,
    DateTimeOffset? DeliveryDeadline,
    DateTimeOffset? AcceptanceDeadline,
    DateTimeOffset CreatedAt
)
{
    public static ReviewCaseResponse From(ReviewCase c) =>
        new(
            c.Id.ToString(),
            c.Status,
            c.Result,
            c.ReviewSummary,
            c.CannotVerifyReason,
            c.DeclineReason,
            c.DocumentId.ToString(),
            c.SourceVersionId.ToString(),
            c.ExpertProfileId.ToString(),
            c.Fee,
            c.TurnaroundHours,
            c.ProblemDescription,
            c.ExpectedOutcome,
            c.PaymentDeadline,
            ReviewCase.UnpaidStatuses.Contains(c.Status) ? null : c.ResponseDeadline,
            c.DeliveryDeadline,
            c.AcceptanceDeadline,
            c.CreatedAt
        );
}
