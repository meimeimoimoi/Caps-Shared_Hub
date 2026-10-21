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
    IPricingRepository pricing,
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
        var prices = profile == null ? [] : await pricing.ListByProfileAsync(profile.Id, ct);
        var services = await catalog.ListActiveAsync(ct);
        var now = clock.GetUtcNow();
        var today = PricingRules.BusinessDate(now);
        var slots = profile == null ? [] : await availability.ListOpenAsync(profile.Id, now, ct);
        // The expert's own token is the freshest account status
        var accountActive = query.AccountStatus == ActiveAccount;
        var hasOpenSlot = slots.Any(x => x.StartAt > now);

        var readiness = services
            .Select(service =>
            {
                var qualification = latest.FirstOrDefault(x => x.ServiceCode == service.Code);
                var versions = prices.Where(x => x.QualificationId == qualification?.Id).ToArray();
                return Readiness(
                    service,
                    application?.Status,
                    qualification,
                    versions.FirstOrDefault(x => x.IsInEffect(today)),
                    versions.FirstOrDefault(x => x.Status == PricingStatus.PendingApproval),
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
            Version,
            profile?.Phone
        );
    }

    private const string ActiveAccount = "ACTIVE";

    // An approved service is bookable once BR-M01 holds; before that the reason follows the furthest step reached
    private static ServiceReadinessResponse Readiness(
        ServiceCatalogItem service,
        string? applicationStatus,
        ExpertServiceQualification? qualification,
        ServicePricingVersion? inEffect,
        ServicePricingVersion? pending,
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
                    inEffect != null,
                    accepting,
                    hasOpenSlot
                );
        string[] reasons = facts switch
        {
            null => [PortalAccessRules.ReasonBeforeQualification(applicationStatus)],
            { QualificationStatus: QualificationStatus.ApprovedForService } =>
                MarketplaceRules.Missing(facts, pending != null),
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
            inEffect == null
                ? null
                : new(
                    $"v{inEffect.Sequence}",
                    StartOfDay(inEffect.EffectiveFrom),
                    inEffect.EffectiveTo is { } to ? StartOfDay(to.AddDays(1)) : null
                ),
            pending == null ? null : $"v{pending.Sequence}"
        );
    }

    // Business dates are Vietnam dates (UTC+7)
    private static DateTimeOffset StartOfDay(DateOnly day) =>
        new(day.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(7));
}
