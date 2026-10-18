using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Portal;
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
        var services = await catalog.ListActiveAsync(ct);

        var readiness = services
            .Select(service =>
                Readiness(
                    service,
                    application?.Status,
                    latest.FirstOrDefault(x => x.ServiceCode == service.Code)?.Status
                )
            )
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
            clock.GetUtcNow(),
            Version
        );
    }

    // No pricing yet: nothing is bookable; the reason comes from the qualification, or Gate 1 before one exists
    private static ServiceReadinessResponse Readiness(
        ServiceCatalogItem service,
        string? applicationStatus,
        string? qualificationStatus
    ) =>
        new(
            service.Code,
            service.Name,
            qualificationStatus,
            service.Status,
            false,
            false,
            [
                qualificationStatus == null
                    ? PortalAccessRules.ReasonBeforeQualification(applicationStatus)
                    : PortalAccessRules.ReasonForQualification(qualificationStatus),
            ],
            null,
            null
        );
}
