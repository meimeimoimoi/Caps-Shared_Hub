using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client and expert of each of these cases.</summary>
public sealed record ListCasePartiesQuery(Guid[] Ids);

/// <summary>One row per known case, duplicates and unknown ids skipped.</summary>
public sealed class ListCasePartiesHandler(IReviewCaseLookup cases)
    : IQueryHandler<ListCasePartiesQuery, CasePartiesResponse[]>
{
    public async Task<CasePartiesResponse[]> HandleAsync(
        ListCasePartiesQuery query,
        CancellationToken ct
    )
    {
        var found = await cases.ListByIdsAsync([.. query.Ids.Distinct()], ct);
        return
        [
            .. found.Select(c => new CasePartiesResponse(
                c.Id.ToString(),
                c.RequesterEmail,
                c.ExpertProfileId.ToString()
            )),
        ];
    }
}
