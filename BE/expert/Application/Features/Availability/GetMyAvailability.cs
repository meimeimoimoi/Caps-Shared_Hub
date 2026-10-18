using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>Reads the signed-in expert's open slots and per-service request switches.</summary>
public sealed record GetMyAvailabilityQuery(Applicant Applicant);

/// <summary>Builds the availability view; empty before the expert has a profile.</summary>
public sealed class GetMyAvailabilityHandler(
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IAvailabilityRepository availability,
    IServiceCatalogRepository catalog,
    TimeProvider clock
) : IQueryHandler<GetMyAvailabilityQuery, MyAvailabilityResponse>
{
    public async Task<MyAvailabilityResponse> HandleAsync(
        GetMyAvailabilityQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.Applicant.UserId, ct);
        var slots =
            profile == null
                ? []
                : await availability.ListOpenAsync(profile.Id, clock.GetUtcNow(), ct);
        var latest =
            profile == null ? [] : await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return Describe(slots, latest, names);
    }

    public static MyAvailabilityResponse Describe(
        IEnumerable<AvailabilitySlot> slots,
        IEnumerable<ExpertServiceQualification> latest,
        IReadOnlyDictionary<string, string> names
    ) =>
        new(
            slots
                .OrderBy(x => x.StartAt)
                .Select(x => new AvailabilitySlotResponse(
                    x.Id.ToString(),
                    x.StartAt,
                    x.EndAt,
                    x.Status
                ))
                .ToArray(),
            latest
                .Where(x => names.ContainsKey(x.ServiceCode))
                .Select(x => new ServiceAvailabilityResponse(
                    x.ServiceCode,
                    names[x.ServiceCode],
                    x.Status,
                    x.AcceptingRequests,
                    x.Status == QualificationStatus.ApprovedForService
                ))
                .ToArray(),
            (int)AvailabilityRules.MinDuration.TotalHours,
            (int)AvailabilityRules.MaxDuration.TotalHours,
            AvailabilityRules.MaxOpenSlots,
            (int)AvailabilityRules.MaxAhead.TotalDays
        );
}
