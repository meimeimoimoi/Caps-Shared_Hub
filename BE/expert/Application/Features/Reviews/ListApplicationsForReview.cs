using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>The review queue; null status means applications waiting for Gate 1 (SUBMITTED).</summary>
public sealed record ListApplicationsForReviewQuery(string? Status);

/// <summary>Lists applications in one status, oldest submission first.</summary>
public sealed class ListApplicationsForReviewHandler(
    IExpertApplicationRepository applications,
    IScreeningRepository screeningRepo
) : IQueryHandler<ListApplicationsForReviewQuery, IReadOnlyList<ReviewQueueItemResponse>>
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
        var summaries = await screeningRepo.GetLatestSummaryByApplicationAsync(
            found.Select(x => x.Id).ToArray(),
            ct
        );
        return found
            .Select(x =>
            {
                summaries.TryGetValue(x.Id, out var summary);
                return new ReviewQueueItemResponse(
                    x.Id.ToString(),
                    x.ExpertProfile.UserId.ToString(),
                    x.ExpertProfile.DisplayName,
                    x.ExpertProfile.YearsExperience,
                    x.ExpertProfile.Fields,
                    x.Status,
                    x.SubmittedAt,
                    x.PreviousApplicationId != null,
                    summary.OpenPointCount,
                    summary.Status
                );
            })
            .ToArray();
    }
}
