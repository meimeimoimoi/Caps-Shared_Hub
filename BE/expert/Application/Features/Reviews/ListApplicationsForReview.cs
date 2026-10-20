using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>The review queue; null status means applications waiting for Gate 1 (SUBMITTED).</summary>
public sealed record ListApplicationsForReviewQuery(string? Status);

/// <summary>Lists applications in one status, oldest submission first.</summary>
public sealed class ListApplicationsForReviewHandler(IExpertApplicationRepository applications)
    : IQueryHandler<ListApplicationsForReviewQuery, IReadOnlyList<ReviewQueueItemResponse>>
{
    public async Task<IReadOnlyList<ReviewQueueItemResponse>> HandleAsync(
        ListApplicationsForReviewQuery query,
        CancellationToken ct
    )
    {
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? ExpertApplicationStatus.Submitted
            : query.Status.Trim().ToUpperInvariant();
        var found = await applications.ListByStatusAsync(status, ct);
        return found
            .Select(x => new ReviewQueueItemResponse(
                x.Id.ToString(),
                x.ExpertProfile.UserId.ToString(),
                x.ExpertProfile.DisplayName,
                x.ExpertProfile.YearsExperience,
                x.ExpertProfile.Fields,
                x.Status,
                x.SubmittedAt,
                x.PreviousApplicationId != null
            ))
            .ToArray();
    }
}
