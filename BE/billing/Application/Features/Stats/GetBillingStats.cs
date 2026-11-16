using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Stats;

/// <summary>Billing statistics over the last <paramref name="Months"/> calendar months, including the current one.</summary>
public sealed record GetBillingStatsQuery(int Months);

/// <summary>Sums settlements per month; escrow and payout totals are grouped in the database.</summary>
public sealed class GetBillingStatsHandler(IBillingStatsReader stats, TimeProvider clock)
    : IQueryHandler<GetBillingStatsQuery, BillingStatsResponse>
{
    public async Task<BillingStatsResponse> HandleAsync(
        GetBillingStatsQuery query,
        CancellationToken ct
    )
    {
        var months = StatMonths.Last(query.Months, clock.GetUtcNow());
        var settlements = await stats.ListSettlementsAsync(months[0].Start, months[^1].End, ct);
        var expertPayout = new long[months.Count];
        var platformFee = new long[months.Count];
        var refunds = new long[months.Count];
        foreach (var settlement in settlements)
        {
            var i = StatMonths.IndexOf(months, settlement.SettledAt);
            if (i < 0)
                continue;
            expertPayout[i] += settlement.ExpertPayout;
            platformFee[i] += settlement.PlatformFee;
            refunds[i] += settlement.UserRefund;
        }
        var periods = months
            .Select(
                (month, i) =>
                    new BillingStatPeriodResponse(
                        month.Key,
                        month.Partial,
                        expertPayout[i],
                        platformFee[i],
                        refunds[i]
                    )
            )
            .ToArray();
        var escrows = await stats.TotalEscrowsByStatusAsync(ct);
        var payouts = await stats.TotalPayoutsByStatusAsync(ct);
        return new BillingStatsResponse(periods, [.. escrows], [.. payouts]);
    }
}
