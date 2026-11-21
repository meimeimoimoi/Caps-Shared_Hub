using System.Text.Json;
using Caps.Workflow.Application.Features.ReviewCases;

namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>A review request for one version of the client's document; the price comes from the expert service.</summary>
public sealed record RequestReviewRequest(
    Guid DocumentId,
    Guid SourceVersionId,
    Guid ExpertProfileId,
    string ServiceCode,
    string? ProblemDescription,
    string? ExpectedOutcome,
    long? ExpectedFee = null
)
{
    public RequestReviewCommand ToCommand(Guid userId, string? email) =>
        new(
            userId,
            email,
            DocumentId,
            SourceVersionId,
            ExpertProfileId,
            ServiceCode,
            ProblemDescription,
            ExpectedOutcome,
            ExpectedFee
        );
}

/// <summary>Why the expert turns the request down, or gives up a case they accepted.</summary>
public sealed record DeclineReviewRequest(string? Reason);

/// <summary>A question from the expert or an answer from the client, up to 4000 characters.</summary>
public sealed record CaseTextRequest(string? Message);

/// <summary>The review result: VERIFIED, or CANNOT_VERIFY with a reason.</summary>
public sealed record DeliverReviewRequest(
    string? Result,
    string? Summary,
    string? CannotVerifyReason,
    string[]? Citations,
    bool Attested,
    JsonElement? RevisedContent
);

/// <summary>The expert's draft of the revised document, a JSON object.</summary>
public sealed record SaveRevisionRequest(JsonElement? RevisedContent);

/// <summary>1 to 5 stars for the expert, with an optional comment.</summary>
public sealed record RateReviewRequest(int Stars, string? Comment);
