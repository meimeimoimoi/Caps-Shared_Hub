using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff paid a payout by hand: the bank transaction id, the amount typed again and when it left.</summary>
public sealed record ConfirmManualPayoutCommand(
    Guid PayoutId,
    Guid StaffId,
    string BankRef,
    long Amount,
    DateTimeOffset TransferredAt
);

/// <summary>
/// Marks a payout paid by hand while no PayOS payout channel is configured. Runs under the row lock and the
/// same checks as a PayOS transfer (hold period, staff hold, attempts, verified account); the expert is told.
/// </summary>
public sealed class ConfirmManualPayoutHandler(
    IPayoutRepository payouts,
    IBankAccountRepository bankAccounts,
    IPayoutGateway gateway,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar calendar,
    IBillingNotificationOutbox outbox,
    PayoutFeePolicy fees
) : ICommandHandler<ConfirmManualPayoutCommand, PayoutResponse>
{
    public async Task<PayoutResponse> HandleAsync(
        ConfirmManualPayoutCommand command,
        CancellationToken ct
    )
    {
        if (gateway.IsAvailable)
            throw BillingErrors.PayoutChannelAvailable();
        var bankRef = command.BankRef.Trim();

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var payout =
            await payouts.LockAsync(command.PayoutId, ct) ?? throw BillingErrors.PayoutNotFound();
        // The unique index is the last guard; this gives staff a readable error first
        if (await payouts.ProviderRefExistsAsync(bankRef, ct))
            throw BillingErrors.PayoutBankRefUsed();
        var now = clock.GetUtcNow();
        var account = await PayoutAccounts.PickAsync(bankAccounts, payout, ct);
        var newAccount = PayoutAccounts.Use(payout, account, now);
        payout.ConfirmManual(
            command.StaffId,
            bankRef,
            command.Amount,
            command.TransferredAt,
            fees.PerTransfer,
            now,
            newAccount
        );
        PayoutNotices.Enqueue(outbox, payout, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayoutResponse.From(payout, calendar);
    }
}
