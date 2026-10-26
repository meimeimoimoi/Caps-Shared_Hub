using Caps.Workflow.Application.Features.ReviewCases;

namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>A review request for one version of the client's document; the price comes from the expert service.</summary>
public sealed record RequestReviewRequest(
    Guid DocumentId,
    Guid SourceVersionId,
    Guid ExpertProfileId,
    string ServiceCode,
    string? ProblemDescription,
    string? ExpectedOutcome
)
{
    public RequestReviewCommand ToCommand(Guid userId) =>
        new(
            userId,
            DocumentId,
            SourceVersionId,
            ExpertProfileId,
            ServiceCode,
            ProblemDescription,
            ExpectedOutcome
        );
}

/// <summary>Why the expert turns the request down.</summary>
public sealed record DeclineReviewRequest(string? Reason);

/// <summary>A question from the expert or an answer from the client, up to 4000 characters.</summary>
public sealed record CaseTextRequest(string? Message);

/// <summary>The review result: VERIFIED, or CANNOT_VERIFY with a reason.</summary>
public sealed record DeliverReviewRequest(
    string? Result,
    string? Summary,
    string? CannotVerifyReason
);
