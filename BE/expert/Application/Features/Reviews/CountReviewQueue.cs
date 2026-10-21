using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Applications and qualifications per status, for tab counts and sidebar badges.</summary>
public sealed record CountReviewQueueQuery;

/// <summary>Two grouped counts in the database; no rows are loaded.</summary>
public sealed class CountReviewQueueHandler(IReviewQueueReader queue)
    : IQueryHandler<CountReviewQueueQuery, ReviewQueueCountsResponse>
{
    public async Task<ReviewQueueCountsResponse> HandleAsync(
        CountReviewQueueQuery query,
        CancellationToken ct
    )
    {
        var applications = await queue.CountApplicationsByStatusAsync(ct);
        var qualifications = await queue.CountQualificationsByStatusAsync(ct);
        return new ReviewQueueCountsResponse(applications, qualifications);
    }
}
