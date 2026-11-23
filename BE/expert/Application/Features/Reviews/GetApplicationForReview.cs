using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Reads one application for a reviewer.</summary>
public sealed record GetApplicationForReviewQuery(Guid ApplicationId);

/// <summary>Any application, in any status; APPLICATION_NOT_FOUND when the id is unknown.</summary>
public sealed class GetApplicationForReviewHandler(
    IExpertApplicationRepository applications,
    IReviewDescriber describer
) : IQueryHandler<GetApplicationForReviewQuery, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        GetApplicationForReviewQuery query,
        CancellationToken ct
    )
    {
        var application =
            await applications.FindWithProfileAsync(query.ApplicationId, ct)
            ?? throw ExpertErrors.ApplicationNotFound();
        return await describer.DescribeAsync(application, ct);
    }
}
