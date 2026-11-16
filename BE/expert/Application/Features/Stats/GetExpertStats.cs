using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Stats;

/// <summary>Expert statistics over the last <paramref name="Months"/> calendar months, including the current one.</summary>
public sealed record GetExpertStatsQuery(int Months);

/// <summary>Counts first approvals per month; the current counts are computed in the database.</summary>
public sealed class GetExpertStatsHandler(IExpertStatsReader stats, TimeProvider clock)
    : IQueryHandler<GetExpertStatsQuery, ExpertStatsResponse>
{
    public async Task<ExpertStatsResponse> HandleAsync(
        GetExpertStatsQuery query,
        CancellationToken ct
    )
    {
        var months = StatMonths.Last(query.Months, clock.GetUtcNow());
        var approvals = await stats.ListFirstApprovalsAsync(months[0].Start, months[^1].End, ct);
        var newExperts = new int[months.Count];
        foreach (var approvedAt in approvals)
        {
            var i = StatMonths.IndexOf(months, approvedAt);
            if (i >= 0)
                newExperts[i]++;
        }
        var periods = months
            .Select(
                (month, i) => new ExpertStatPeriodResponse(month.Key, month.Partial, newExperts[i])
            )
            .ToArray();
        var serving = await stats.CountServingExpertsAsync(ct);
        var suspended = await stats.CountSuspendedExpertsAsync(ct);
        return new ExpertStatsResponse(periods, serving, suspended);
    }
}
