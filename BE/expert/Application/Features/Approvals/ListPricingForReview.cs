using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Features.Approvals;

/// <summary>Price changes in one status; null means those waiting for a System Admin.</summary>
public sealed record ListPricingForReviewQuery(string? Status);

/// <summary>Lists versions oldest submission first, each with the approved price it is measured against.</summary>
public sealed class ListPricingForReviewHandler(
    IPricingRepository pricing,
    IQualificationRepository qualifications
) : IQueryHandler<ListPricingForReviewQuery, IReadOnlyList<PricingReviewItemResponse>>
{
    public async Task<IReadOnlyList<PricingReviewItemResponse>> HandleAsync(
        ListPricingForReviewQuery query,
        CancellationToken ct
    )
    {
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? PricingStatus.PendingApproval
            : query.Status.Trim().ToUpperInvariant();
        var versions = await pricing.ListByStatusAsync(status, ct);
        var items = new List<PricingReviewItemResponse>();
        foreach (var v in versions)
        {
            var qualification = await qualifications.FindWithProfileAsync(v.QualificationId, ct);
            var current = await pricing.FindLatestApprovedAsync(v.QualificationId, ct);
            items.Add(
                new(
                    v.Id.ToString(),
                    v.QualificationId.ToString(),
                    qualification?.ExpertProfile.UserId.ToString() ?? "",
                    qualification?.ExpertProfile.DisplayName,
                    v.ServiceCode,
                    v.Sequence,
                    v.Amount,
                    current?.Id == v.Id ? null : current?.Amount,
                    v.ChangePercent,
                    v.EffectiveFrom,
                    v.Reason,
                    v.Status,
                    v.SubmittedAt,
                    v.DecisionNote
                )
            );
        }
        return items;
    }
}
