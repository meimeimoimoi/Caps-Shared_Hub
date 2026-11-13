using Caps.Workflow.Domain.Review;
using static Caps.Workflow.Application.DTOs.Responses.ReviewCaseResponse;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A review case as its client or expert sees it.</summary>
/// <param name="RequesterUserId">The client, so a user who is both client and expert can tell their roles apart.</param>
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
    string RequesterUserId,
    string? ServiceCode,
    long Fee,
    int TurnaroundHours,
    string ProblemDescription,
    string? ExpectedOutcome,
    DateTimeOffset? PaymentDeadline,
    DateTimeOffset? ResponseDeadline,
    DateTimeOffset? DeliveryDeadline,
    DateTimeOffset? AcceptanceDeadline,
    short? Rating,
    string? RatingComment,
    SettlementResponse? Settlement,
    InfoRequestResponse[]? InfoRequests,
    DateTimeOffset UpdatedAt,
    DateTimeOffset CreatedAt
)
{
    public static ReviewCaseResponse From(
        ReviewCase c,
        IReadOnlyList<InfoRequest>? questions = null
    ) =>
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
            c.RequesterUserId.ToString(),
            c.ServiceCode,
            c.Fee,
            c.TurnaroundHours,
            c.ProblemDescription,
            c.ExpectedOutcome,
            c.PaymentDeadline,
            ReviewCase.UnpaidStatuses.Contains(c.Status) ? null : c.ResponseDeadline,
            c.DeliveryDeadline,
            c.AcceptanceDeadline,
            c.Rating,
            c.RatingComment,
            c.Outcome() is { } s ? new(s.ClientRefund, s.PlatformFee, s.ExpertAmount) : null,
            questions?.Select(InfoRequestResponse.From).ToArray(),
            c.UpdatedAt,
            c.CreatedAt
        );

    /// <summary>How the fee was split once the case ended, in VND.</summary>
    public sealed record SettlementResponse(long ClientRefund, long PlatformFee, long ExpertAmount);

    /// <summary>A question the expert asked, and the client's answer once given.</summary>
    public sealed record InfoRequestResponse(
        string Id,
        string Message,
        DateTimeOffset DueAt,
        string Status,
        string? Response,
        DateTimeOffset? RespondedAt,
        DateTimeOffset CreatedAt
    )
    {
        public static InfoRequestResponse From(InfoRequest r) =>
            new(
                r.Id.ToString(),
                r.Message,
                r.DueAt,
                r.Status,
                r.ResponseMessage,
                r.RespondedAt,
                r.CreatedAt
            );
    }
}
