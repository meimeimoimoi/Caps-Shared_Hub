using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Asks for the payout banner on the admin payout page.</summary>
public sealed record GetPayoutSummaryQuery;

/// <summary>The unsent payouts by deadline stage and the PayOS payout balance (null when unknown).</summary>
/// <remarks>ChannelAvailable is false when PayOS payout keys are missing: staff then pay by hand.</remarks>
public sealed record PayoutSummaryResponse(
    PayoutSummary Summary,
    long? Balance,
    bool ChannelAvailable
);

/// <summary>The same counts as the daily digest, live.</summary>
public sealed class GetPayoutSummaryHandler(
    IPayoutRepository payouts,
    IPayoutGateway gateway,
    TimeProvider clock,
    WorkCalendar calendar
) : IQueryHandler<GetPayoutSummaryQuery, PayoutSummaryResponse>
{
    public async Task<PayoutSummaryResponse> HandleAsync(
        GetPayoutSummaryQuery query,
        CancellationToken ct
    )
    {
        var summary = PayoutSummary.Of(
            await payouts.ListUnsentAsync(ct),
            clock.GetUtcNow(),
            calendar
        );
        return new(summary, await gateway.GetBalanceAsync(ct), gateway.IsAvailable);
    }
}
