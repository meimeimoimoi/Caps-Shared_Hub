using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Reads the signed-in applicant's current application.</summary>
public sealed record GetMyApplicationQuery(Applicant Applicant);

/// <summary>Returns null when the user has never started an application.</summary>
public sealed class GetMyApplicationHandler(
    IExpertProfileRepository profiles,
    IExpertApplicationRepository applications,
    IApplicationDescriber describer
) : IQueryHandler<GetMyApplicationQuery, ExpertApplicationResponse?>
{
    public async Task<ExpertApplicationResponse?> HandleAsync(
        GetMyApplicationQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.Applicant.UserId, ct);
        if (profile == null)
            return null;
        var application = await applications.FindLatestAsync(profile.Id, ct);
        if (application == null)
            return null;
        return await describer.DescribeAsync(query.Applicant, profile, application, ct);
    }
}
