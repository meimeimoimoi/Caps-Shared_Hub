using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>One expert's violations, for the System Admin.</summary>
public sealed record ListViolationsQuery(Guid ExpertProfileId);

/// <summary>Counts the points that still count and the excuses still allowed in the window.</summary>
public sealed class ListViolationsHandler(IExpertViolations violations, TimeProvider clock)
    : IQueryHandler<ListViolationsQuery, ExpertViolationsResponse>
{
    public async Task<ExpertViolationsResponse> HandleAsync(
        ListViolationsQuery query,
        CancellationToken ct
    )
    {
        var since = clock.GetUtcNow().AddDays(-ViolationRules.WindowDays);
        var all = await violations.ListAsync(query.ExpertProfileId, ct);
        var items = all.Select(v => new ExpertViolationResponse(
                v.ReviewCaseId.ToString(),
                v.Kind,
                v.Points,
                v.OccurredAt,
                v.ExcusedAt == null && v.OccurredAt > since,
                v.ExcusedAt,
                v.ExcusedReason
            ))
            .ToArray();
        var excused = all.Count(v => v.ExcusedAt > since);
        return new(
            items.Where(x => x.Counted).Sum(x => x.Points),
            Math.Max(0, ViolationRules.MaxExcuses - excused),
            ViolationRules.WindowDays,
            items
        );
    }
}
