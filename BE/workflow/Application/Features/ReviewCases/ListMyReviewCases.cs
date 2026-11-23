using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The cases the signed-in user requested (client) or reviews (expert).</summary>
public sealed record ListMyReviewCaseQuery(Guid UserId);

/// <summary>Lists the caller's cases, newest first.</summary>
public sealed class ListMyReviewCaseHandler(
    IReviewCaseRepository cases,
    IInfoRequestRepository infoRequest
) : IQueryHandler<ListMyReviewCaseQuery, ReviewCaseResponse[]>
{
    public async Task<ReviewCaseResponse[]> HandleAsync(
        ListMyReviewCaseQuery query,
        CancellationToken ct
    )
    {
        var list = await cases.ListForUserAsync(query.UserId, ct);
        var result = new List<ReviewCaseResponse>(list.Count);
        foreach (var c in list)
        {
            // Only a waiting case needs its question, for the client's answer deadline.
            // ponytail: one query per waiting case, batch by case ids if the list grows large
            var question =
                c.Status == ReviewCaseStatus.AwaitingUserInformation
                    ? await infoRequest.ListAsync(c.Id, ct)
                    : null;
            result.Add(ReviewCaseResponse.From(c, query.UserId, question));
        }
        return result.ToArray();
    }
}
