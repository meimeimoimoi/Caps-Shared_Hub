using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff ask the provider for the outcome of a PROCESSING payout.</summary>
public sealed record RefreshPayoutCommand(Guid PayoutId);

/// <summary>
/// Applies the provider's state to a PROCESSING payout; any other payout is returned unchanged. The provider has
/// no payout webhook, so this is how a transfer is seen to succeed or fail.
/// </summary>
public sealed class RefreshPayoutHandler(
    IPayoutRepository payouts,
    IPayoutGateway gateway,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar calendar,
    IBillingNotificationOutbox outbox,
    PayoutFeePolicy fees
) : ICommandHandler<RefreshPayoutCommand, PayoutResponse>
{
    /// <summary>
    /// The transfer call times out after seconds; a reference the provider still does not know after this long
    /// never reached it, so the attempt is marked failed and may be retried.
    /// </summary>
    public static readonly TimeSpan NotReceivedAfter = TimeSpan.FromMinutes(10);

    public async Task<PayoutResponse> HandleAsync(
        RefreshPayoutCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var payout =
            await payouts.LockAsync(command.PayoutId, ct) ?? throw BillingErrors.PayoutNotFound();
        if (payout.Status != PayoutStatus.Processing)
            return PayoutResponse.From(payout, calendar);

        var report = await gateway.FindAsync(payout.ProviderRef, payout.Reference, ct);
        var now = clock.GetUtcNow();
        if (report != null)
            payout.Apply(report.ProviderRef, report.Status, report.Error, now, fees.PerTransfer);
        else if (payout.ProviderRef == null && now - payout.UpdatedAt >= NotReceivedAfter)
            payout.Fail("NOT_RECEIVED", now);
        // It was PROCESSING above: tell the expert only once PayOS settled it
        if (payout.Status != PayoutStatus.Processing)
            PayoutNotices.Enqueue(outbox, payout, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayoutResponse.From(payout, calendar);
    }
}
