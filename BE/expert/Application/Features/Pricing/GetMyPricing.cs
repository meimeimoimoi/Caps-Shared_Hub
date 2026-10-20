using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Pricing;

/// <summary>Reads the signed-in expert's prices for one service.</summary>
public sealed record GetMyPricingQuery(Applicant Applicant, string ServiceCode);

/// <summary>Uses the service's latest qualification; QUALIFICATION_NOT_FOUND when none exists.</summary>
public sealed class GetMyPricingHandler(
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IPricingDescriber describer
) : IQueryHandler<GetMyPricingQuery, PricingWorkspaceResponse>
{
    public async Task<PricingWorkspaceResponse> HandleAsync(
        GetMyPricingQuery query,
        CancellationToken ct
    )
    {
        var profile =
            await profiles.FindByUserAsync(query.Applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var latest =
            await qualifications.FindLatestAsync(
                profile.Id,
                query.ServiceCode.Trim().ToUpperInvariant(),
                ct
            ) ?? throw ExpertErrors.QualificationNotFound();
        var qualification =
            await qualifications.FindWithProfileAsync(latest.Id, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        return await describer.DescribeAsync(qualification, ct);
    }
}
