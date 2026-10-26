using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The cases the signed-in user requested (client) or reviews (expert).</summary>
public sealed record ListMyReviewCaseQuery(Guid UserId);

/// <summary>Lists the caller's cases, newest first.</summary>
public sealed class ListMyReviewCaseHandler(IReviewCaseRepository cases)
    : IQueryHandler<ListMyReviewCaseQuery, ReviewCaseResponse[]>
{
    public async Task<ReviewCaseResponse[]> HandleAsync(
        ListMyReviewCaseQuery query,
        CancellationToken ct
    )
    {
        var list = await cases.ListForUserAsync(query.UserId, ct);
        return list.Select(ReviewCaseResponse.From).ToArray();
    }
}
