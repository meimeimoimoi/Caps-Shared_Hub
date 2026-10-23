using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Reads the services the signed-in expert can register for.</summary>
public sealed record ListMyQualificationsQuery(Applicant Applicant);

/// <summary>One entry per active catalog service with the latest qualification and whether it can be registered now.</summary>
public sealed class ListMyQualificationsHandler(
    IExpertProfileRepository profiles,
    IExpertApplicationRepository applications,
    IQualificationRepository qualifications,
    IServiceCatalogRepository catalog,
    TimeProvider clock
) : IQueryHandler<ListMyQualificationsQuery, ExpertQualificationsResponse>
{
    public async Task<ExpertQualificationsResponse> HandleAsync(
        ListMyQualificationsQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.Applicant.UserId, ct);
        var application =
            profile == null ? null : await applications.FindLatestAsync(profile.Id, ct);
        var latest =
            profile == null ? [] : await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var services = await catalog.ListActiveAsync(ct);
        var eligible = application?.Status == ExpertApplicationStatus.Eligible;
        var now = clock.GetUtcNow();
        return new(
            application?.Status,
            eligible,
            services
                .Select(service =>
                {
                    var q = latest.FirstOrDefault(x => x.ServiceCode == service.Code);
                    var canRegister =
                        eligible
                        && (
                            q == null
                            || (
                                QualificationStatus.IsClosed(q.Status)
                                && !(q.EarliestReapplyAt > now)
                            )
                        );
                    return new ServiceQualificationSummary(
                        service.Code,
                        service.Name,
                        q?.Id.ToString(),
                        // D4: waiting for final approval reads as competency review
                        q == null ? null : FinalApprovalRules.ExpertStatus(q.Status),
                        q?.SubmittedAt,
                        q?.EarliestReapplyAt,
                        canRegister
                    );
                })
                .ToArray()
        );
    }
}
