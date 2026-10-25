using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>The Gate 2 queue; null status means qualifications waiting for competency review.</summary>
public sealed record ListQualificationsForReviewQuery(string? Status);

/// <summary>Lists qualifications in one status, oldest submission first.</summary>
public sealed class ListQualificationsForReviewHandler(
    IQualificationRepository qualifications,
    IServiceCatalogRepository catalog
) : IQueryHandler<ListQualificationsForReviewQuery, IReadOnlyList<QualificationQueueItemResponse>>
{
    public async Task<IReadOnlyList<QualificationQueueItemResponse>> HandleAsync(
        ListQualificationsForReviewQuery query,
        CancellationToken ct
    )
    {
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? QualificationStatus.CompetencyReview
            : query.Status.Trim().ToUpperInvariant();
        var found = await qualifications.ListByStatusAsync(status, ct);
        // Reviewers read the service name, never the catalog code
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return found
            .Select(x => new QualificationQueueItemResponse(
                x.Id.ToString(),
                x.ExpertProfile.UserId.ToString(),
                x.ExpertProfile.DisplayName,
                x.ExpertProfile.YearsExperience,
                x.ExpertProfile.Fields,
                x.ServiceCode,
                x.Status,
                x.SubmittedAt,
                x.PreviousQualificationId != null,
                names.GetValueOrDefault(x.ServiceCode)
            ))
            .ToArray();
    }
}
