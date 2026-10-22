using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Portal;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Portal;

/// <summary>The signed-in account with the token permissions that also unlock the portal.</summary>
public sealed record GetMyContextQuery(
    Applicant Applicant,
    string AccountStatus,
    bool CanManageServices,
    bool CanWorkCases
);

/// <summary>
/// Builds the Expert Portal context: stage, capabilities and one readiness entry per active catalog
/// service. Readiness follows the service's latest qualification (Gate 2), or the Gate 1 application before one exists.
/// </summary>
public sealed class GetMyContextHandler(
    IExpertProfileRepository profiles,
    IExpertApplicationRepository applications,
    IQualificationRepository qualifications,
    IServiceOfferingRepository offerings,
    IAvailabilityRepository availability,
    IServiceCatalogRepository catalog,
    TimeProvider clock
) : IQueryHandler<GetMyContextQuery, ExpertContextResponse>
{
    private const string Version = "v1";

    public async Task<ExpertContextResponse> HandleAsync(
        GetMyContextQuery query,
        CancellationToken ct
    )
    {
        var applicant = query.Applicant;
        var profile = await profiles.FindByUserAsync(applicant.UserId, ct);
        var application =
            profile == null ? null : await applications.FindLatestAsync(profile.Id, ct);
        var latest =
            profile == null ? [] : await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var prices = profile == null ? [] : await offerings.ListAsync([profile.Id], ct);
        var services = await catalog.ListActiveAsync(ct);
        var now = clock.GetUtcNow();
        var slots = profile == null ? [] : await availability.ListOpenAsync(profile.Id, now, ct);
        // The expert's own token is the freshest account status
        var accountActive = query.AccountStatus == ActiveAccount;
        var hasOpenSlot = slots.Any(x => x.StartAt > now);

        var readiness = services
            .Select(service =>
            {
                var qualification = latest.FirstOrDefault(x => x.ServiceCode == service.Code);
                return Readiness(
                    service,
                    application?.Status,
                    qualification,
                    prices.FirstOrDefault(x => x.ServiceCode == service.Code),
                    accountActive,
                    hasOpenSlot
                );
            })
            .ToArray();
        var facts = new PortalFacts(
            AnyServiceApproved: latest.Any(x => x.Status == QualificationStatus.ApprovedForService),
            AnyServiceBookable: readiness.Any(x => x.BookingAllowed),
            query.CanManageServices,
            query.CanWorkCases
        );
        return new(
            profile?.Id.ToString(),
            profile?.DisplayName ?? applicant.DefaultName,
            applicant.Email,
            query.AccountStatus,
            PortalAccessRules.StageOf(facts),
            application?.Status,
            new(true, null, PortalAccessRules.CapabilitiesOf(facts)),
            readiness,
            now,
            Version
        );
    }

    private const string ActiveAccount = "ACTIVE";

    // An approved service is bookable once BR-M01 holds; before that the reason follows the furthest step reached
    private static ServiceReadinessResponse Readiness(
        ServiceCatalogItem service,
        string? applicationStatus,
        ExpertServiceQualification? qualification,
        ServiceOffering? offering,
        bool accountActive,
        bool hasOpenSlot
    )
    {
        var accepting = qualification?.AcceptingRequests == true;
        var facts =
            qualification == null
                ? null
                : new ListingFacts(
                    qualification.Status,
                    accountActive,
                    service.IsActive,
                    offering != null,
                    accepting,
                    hasOpenSlot
                );
        string[] reasons = facts switch
        {
            null => [PortalAccessRules.ReasonBeforeQualification(applicationStatus)],
            { QualificationStatus: QualificationStatus.ApprovedForService } =>
                MarketplaceRules.Missing(facts),
            _ => [PortalAccessRules.ReasonForQualification(facts.QualificationStatus)],
        };
        return new(
            service.Code,
            service.Name,
            qualification?.Status,
            service.Status,
            accepting && hasOpenSlot,
            facts != null && MarketplaceRules.IsListed(facts),
            reasons,
            offering == null
                ? null
                : new(offering.Fee, offering.TurnaroundHours, offering.UpdatedAt)
        );
    }
}
