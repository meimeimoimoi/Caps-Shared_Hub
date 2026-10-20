using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Reads one qualification for a reviewer.</summary>
public sealed record GetQualificationForReviewQuery(Guid QualificationId);

/// <summary>Any qualification, in any status; QUALIFICATION_NOT_FOUND when the id is unknown.</summary>
public sealed class GetQualificationForReviewHandler(
    IQualificationRepository qualifications,
    IQualificationReviewDescriber describer
) : IQueryHandler<GetQualificationForReviewQuery, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        GetQualificationForReviewQuery query,
        CancellationToken ct
    )
    {
        var qualification =
            await qualifications.FindWithProfileAsync(query.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        return await describer.DescribeAsync(qualification, ct);
    }
}
