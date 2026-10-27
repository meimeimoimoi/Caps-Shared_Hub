using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>Reads the signed-in expert's capacity and per-service request switches.</summary>
public sealed record GetMyAvailabilityQuery(Applicant Applicant);

/// <summary>Builds the availability view; empty before the expert has a profile.</summary>
public sealed class GetMyAvailabilityHandler(
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IServiceCatalogRepository catalog
) : IQueryHandler<GetMyAvailabilityQuery, MyAvailabilityResponse>
{
    public async Task<MyAvailabilityResponse> HandleAsync(
        GetMyAvailabilityQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.Applicant.UserId, ct);
        var latest =
            profile == null ? [] : await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return Describe(profile, latest, names);
    }

    public static MyAvailabilityResponse Describe(
        ExpertProfile? profile,
        IEnumerable<ExpertServiceQualification> latest,
        IReadOnlyDictionary<string, string> names
    ) =>
        new(
            profile?.Capacity ?? 0,
            profile?.ActiveCases ?? 0,
            ExpertProfile.MaxCapacity,
            latest
                .Where(x => names.ContainsKey(x.ServiceCode))
                .Select(x => new ServiceAvailabilityResponse(
                    x.ServiceCode,
                    names[x.ServiceCode],
                    x.Status,
                    x.AcceptingRequests,
                    x.Status == QualificationStatus.ApprovedForService
                ))
                .ToArray()
        );
}
