using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>How many open cases the user is in, read before a staff member locks the account.</summary>
public sealed record CountOpenCasesQuery(Guid UserId);

/// <summary>Counts the cases from booking until they end, disputes included; closed cases do not count.</summary>
public sealed class CountOpenCasesHandler(IReviewCaseLookup cases)
    : IQueryHandler<CountOpenCasesQuery, OpenCaseCountResponse>
{
    public async Task<OpenCaseCountResponse> HandleAsync(
        CountOpenCasesQuery query,
        CancellationToken ct
    )
    {
        var (asClient, asExpert) = await cases.CountOpenForUserAsync(query.UserId, ct);
        return new(asClient, asExpert);
    }
}
