using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Applications and qualifications per status, for tab counts and sidebar badges.</summary>
/// <param name="ViewerUserId">The available counts keep what this reviewer holds or nobody holds.</param>
public sealed record CountReviewQueueQuery(Guid ViewerUserId);

/// <summary>Two grouped counts in the database; no rows are loaded.</summary>
public sealed class CountReviewQueueHandler(
    IReviewQueueReader queue,
    IExpertPolicyProvider policies,
    TimeProvider clock
) : IQueryHandler<CountReviewQueueQuery, ReviewQueueCountsResponse>
{
    public async Task<ReviewQueueCountsResponse> HandleAsync(
        CountReviewQueueQuery query,
        CancellationToken ct
    )
    {
        var applications = await queue.CountApplicationsByStatusAsync(ct);
        var qualifications = await queue.CountQualificationsByStatusAsync(ct);
        var scope = new ReviewQueueScope(
            ReviewClaimFilter.MineOrUnclaimed,
            query.ViewerUserId,
            clock.GetUtcNow(),
            (await policies.GetReviewClaimAsync(ct)).Hold
        );
        return new ReviewQueueCountsResponse(
            applications,
            qualifications,
            await queue.CountApplicationsByStatusAsync(scope, ct),
            await queue.CountQualificationsByStatusAsync(scope, ct),
            (await policies.GetReviewWorkAsync(ct)).SlaDays
        );
    }
}
