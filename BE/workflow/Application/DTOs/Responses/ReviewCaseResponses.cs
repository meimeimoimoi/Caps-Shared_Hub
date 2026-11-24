using System.Text.Json;
using Caps.Workflow.Domain.Review;
using static Caps.Workflow.Application.DTOs.Responses.ReviewCaseResponse;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>A review case as its client or expert sees it.</summary>
/// <param name="RequesterUserId">The client, so a user who is both client and expert can tell their roles apart.</param>
/// <param name="Fee">Price frozen at booking, in VND.</param>
/// <param name="SourceFileName">
/// Name of the file the client uploaded as the document under review; null for a draft written in the app.
/// Only the case detail fills it.
/// </param>
public sealed record ReviewCaseResponse(
    string Id,
    string Status,
    string? Result,
    string? ReviewSummary,
    String? CannotVerifyReason,
    string[] Citations,
    JsonElement? SourceContent,
    JsonElement? RevisedContent,
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
    DateTimeOffset? PaidAt,
    DateTimeOffset? AcceptedAt,
    DateTimeOffset? DeliveredAt,
    short? Rating,
    string? RatingComment,
    DateTimeOffset? RatedAt,
    SettlementResponse? Settlement,
    InfoRequestResponse[]? InfoRequests,
    ExtensionResponse? Extension,
    ClientTermsResponse? ClientTerms,
    ExpertTermsResponse? ExpertTerms,
    DateTimeOffset UpdatedAt,
    DateTimeOffset CreatedAt,
    string? SourceFileName = null
)
{
    /// <summary>
    /// The case as viewerId sees it: each side gets only its own money, in VND; the platform's share and
    /// the percentages behind it stay internal. Client and expert are never the same account.
    /// </summary>
    public static ReviewCaseResponse From(
        ReviewCase c,
        Guid viewerId,
        IReadOnlyList<InfoRequest>? questions = null,
        string? sourceContent = null,
        string? sourceFileName = null
    )
    {
        var forExpert = viewerId == c.ExpertUserId;
        return new(
            c.Id.ToString(),
            c.Status,
            c.Result,
            c.ReviewSummary,
            c.CannotVerifyReason,
            c.Citations,
            Json(sourceContent),
            // The client sees the revision only once it is delivered; the expert also sees the draft
            c.DeliveredAt
                is not null
            || forExpert
                ? Json(c.RevisedContent)
                : null,
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
            c.PaidAt,
            c.AcceptedAt,
            c.DeliveredAt,
            c.Rating,
            c.RatingComment,
            c.RatedAt,
            c.Outcome() switch
            {
                null => null,
                { } s when forExpert => new SettlementResponse(null, s.ExpertAmount),
                { } s => new SettlementResponse(s.ClientRefund, null),
            },
            questions?.Select(InfoRequestResponse.From).ToArray(),
            c.ExtensionRequestedAt is { } asked
                ? new(
                    c.ExtensionDays!.Value,
                    c.ExtensionReason!,
                    asked,
                    c.ExtensionDecision,
                    c.ExtensionDecidedAt
                )
                : null,
            forExpert
                ? null
                : new ClientTermsResponse(
                    c.LatePenaltyHours,
                    c.LateCancelHours,
                    c.NoResponseDays,
                    c.DeliveredSplit(c.LatePenaltyPct).ClientRefund,
                    c.ShareOf(c.NoDeliveryRefundPct),
                    c.ShareOf(c.NoResponseRefundPct),
                    c.DeliveredSplit(c.LateRefundPct).ClientRefund,
                    c.ShareOf(Math.Max(c.LateRefundPct, ReviewCase.DisputeUpheldRefundPct))
                ),
            forExpert
                ? new ExpertTermsResponse(
                    c.LatePenaltyHours,
                    c.LateCancelHours,
                    c.NoResponseDays,
                    c.DeliveredSplit(0).ExpertAmount,
                    c.DeliveredSplit(c.LatePenaltyPct).ExpertAmount,
                    c.ShareOf(c.NoResponseExpertPct)
                )
                : null,
            c.UpdatedAt,
            c.CreatedAt,
            sourceFileName
        );
    }

    /// <summary>The viewer's own part of the final split, in VND: the client's refund or the expert's payout.</summary>
    public sealed record SettlementResponse(long? ClientRefund, long? ExpertAmount);

    /// <summary>The expert's extension request; Decision is null while the client has not answered.</summary>
    public sealed record ExtensionResponse(
        int Days,
        string Reason,
        DateTimeOffset RequestedAt,
        string? Decision,
        DateTimeOffset? DecidedAt
    );

    /// <summary>What the client gets back in each case, in VND, from the rules frozen at booking.</summary>
    /// <param name="LateRefund">Back if the expert delivers late, within LatePenaltyHours.</param>
    /// <param name="NoDeliveryRefund">Back if nothing is delivered within LateCancelHours of the deadline.</param>
    /// <param name="NoResponseRefund">Back if the client leaves a question unanswered for NoResponseDays.</param>
    /// <param name="AcceptRefund">Back if the client accepts the delivery as it stands: the late refund, or 0.</param>
    /// <param name="DisputeRefund">Back if the admin upholds a dispute.</param>
    public sealed record ClientTermsResponse(
        int LatePenaltyHours,
        int LateCancelHours,
        int NoResponseDays,
        long LateRefund,
        long NoDeliveryRefund,
        long NoResponseRefund,
        long AcceptRefund,
        long DisputeRefund
    );

    /// <summary>What the expert receives in each case, in VND, from the rules frozen at booking.</summary>
    /// <param name="Payout">Paid on an on-time delivery the client accepts.</param>
    /// <param name="LatePayout">Paid on a delivery within LatePenaltyHours of the deadline.</param>
    /// <param name="NoResponsePayout">Paid if the client leaves a question unanswered for NoResponseDays.</param>
    public sealed record ExpertTermsResponse(
        int LatePenaltyHours,
        int LateCancelHours,
        int NoResponseDays,
        long Payout,
        long LatePayout,
        long NoResponsePayout
    );

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

    private static JsonElement? Json(string? json) =>
        json is null ? null : JsonSerializer.Deserialize<JsonElement>(json);
}

/// <summary>Who the client and the expert of a case are, for staff lists keyed by case id.</summary>
/// <param name="RequesterEmail">The client's email kept at booking; null for cases booked before it was kept.</param>
public sealed record CasePartiesResponse(
    string ReviewCaseId,
    string? RequesterEmail,
    string ExpertProfileId
);
