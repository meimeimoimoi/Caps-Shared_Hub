using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>One case seen by one of its parties.</summary>
public sealed record GetReviewCaseQuery(Guid UserId, Guid ReviewCaseId);

/// <summary>Returns the case; to anyone but its client or expert it does not exist.</summary>
public sealed class GetReviewCaseHandler(IReviewCaseRepository cases)
    : IQueryHandler<GetReviewCaseQuery, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        GetReviewCaseQuery query,
        CancellationToken ct
    )
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.EnsureVisibleTo(query.UserId);
        return ReviewCaseResponse.From(reviewCase);
    }
}
