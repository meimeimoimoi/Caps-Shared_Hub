using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the service's versions, audit trail and pricing policy.</summary>
public sealed class PricingDescriber(
    IPricingRepository pricing,
    IServiceCatalogRepository catalog,
    ExpertPolicyOptions policy
) : IPricingDescriber
{
    public async Task<PricingWorkspaceResponse> DescribeAsync(
        ExpertServiceQualification qualification,
        CancellationToken ct
    )
    {
        var versions = await pricing.ListAsync(qualification.Id, ct);
        var events = await pricing.ListEventsAsync(qualification.Id, ct);
        var service = await catalog.FindAsync(qualification.ServiceCode, ct);
        var expertUserId = qualification.ExpertProfile.UserId;
        var rules = policy.Pricing;
        return new(
            qualification.Id.ToString(),
            qualification.ServiceCode,
            service?.Name ?? qualification.ServiceCode,
            events.Count,
            rules.MinPrice,
            rules.MaxPrice,
            rules.AutoApproveMaxChangePercent,
            qualification.Status == QualificationStatus.ApprovedForService
                && versions.All(x => x.Status != PricingStatus.PendingApproval),
            versions.Select(ToResponse).ToArray(),
            events
                .Select(x => new PricingAuditResponse(
                    x.PricingVersionId.ToString(),
                    x.Action,
                    x.CreatedAt,
                    x.ActorUserId == null ? "SYSTEM"
                        : x.ActorUserId == expertUserId ? "EXPERT"
                        : "ADMIN",
                    x.Note
                ))
                .ToArray()
        );
    }

    public static ServicePricingResponse ToResponse(ServicePricingVersion x) =>
        new(
            x.Id.ToString(),
            x.Sequence,
            x.Amount,
            x.EffectiveFrom,
            x.EffectiveTo,
            x.Reason,
            x.Status,
            x.AutoApproved,
            x.ChangePercent,
            x.DecisionNote,
            x.SubmittedAt,
            x.CreatedAt,
            x.UpdatedAt
        );
}
