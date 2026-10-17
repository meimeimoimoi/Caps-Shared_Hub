using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Portal;

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
/// service. Until Expert-Service qualifications exist (Gate 2), readiness follows the Gate 1 application.
/// </summary>
public sealed class GetMyContextHandler(
    IExpertProfileRepository profiles,
    IExpertApplicationRepository applications,
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
        var services = await catalog.ListActiveAsync(ct);

        var readiness = services
            .Select(service => Readiness(service, application?.Status))
            .ToArray();
        var facts = new PortalFacts(
            AnyServiceApproved: false,
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

    // No qualification or pricing yet: nothing is bookable and the reason comes from Gate 1
    private static ServiceReadinessResponse Readiness(
        ServiceCatalogItem service,
        string? applicationStatus
    ) =>
        new(
            service.Code,
            service.Name,
            null,
            service.Status,
            false,
            false,
            [PortalAccessRules.ReasonBeforeQualification(applicationStatus)],
            null,
            null
        );
}
