using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>The admin queue of open disputes.</summary>
public sealed record ListOpenDisputesQuery;

/// <summary>Open disputes, earliest decision deadline first, each flagged when its window has passed.</summary>
public sealed class ListOpenDisputesHandler(IReviewDisputeRepository disputes, TimeProvider clock)
    : IQueryHandler<ListOpenDisputesQuery, AdminDisputeResponse[]>
{
    public async Task<AdminDisputeResponse[]> HandleAsync(
        ListOpenDisputesQuery query,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var open = await disputes.ListOpenAsync(ct);
        return open.Select(x => new AdminDisputeResponse(
                x.Case.Id.ToString(),
                x.Case.Fee,
                x.Case.PlatformFeePct,
                x.Case.Result,
                x.Case.ReviewSummary,
                now > x.Dispute.DecideBy,
                DisputeResponse.From(x.Dispute)
            ))
            .ToArray();
    }
}
