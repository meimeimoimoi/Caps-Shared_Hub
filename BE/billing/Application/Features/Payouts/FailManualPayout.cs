using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff report that a manual transfer failed, with the bank's reason.</summary>
public sealed record FailManualPayoutCommand(Guid PayoutId, Guid StaffId, string Reason);

/// <summary>
/// Records a failed manual transfer as one used attempt (at most MaxAttempts, then the expert needs another
/// account) and tells the expert.
/// </summary>
public sealed class FailManualPayoutHandler(
    IPayoutRepository payouts,
    IBankAccountRepository bankAccounts,
    IPayoutGateway gateway,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar calendar,
    IBillingNotificationOutbox outbox
) : ICommandHandler<FailManualPayoutCommand, PayoutResponse>
{
    public async Task<PayoutResponse> HandleAsync(
        FailManualPayoutCommand command,
        CancellationToken ct
    )
    {
        if (gateway.IsAvailable)
            throw BillingErrors.PayoutChannelAvailable();

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var payout =
            await payouts.LockAsync(command.PayoutId, ct) ?? throw BillingErrors.PayoutNotFound();
        var now = clock.GetUtcNow();
        var account = await PayoutAccounts.PickAsync(bankAccounts, payout, ct);
        var newAccount = PayoutAccounts.Use(payout, account, now);
        payout.FailManual(command.StaffId, command.Reason, now, newAccount);
        PayoutNotices.Enqueue(outbox, payout, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayoutResponse.From(payout, calendar);
    }
}
