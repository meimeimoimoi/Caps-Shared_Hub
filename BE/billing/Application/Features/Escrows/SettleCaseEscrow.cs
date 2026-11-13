using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>
/// The workflow service settles a completed review case with the split it computed: a late delivery's
/// refund to the client, the platform fee and the expert's payout.
/// </summary>
public sealed record SettleCaseEscrowCommand(
    Guid ReviewCaseId,
    Guid ExpertUserId,
    long UserRefund,
    long PlatformFee,
    long ExpertPayout
);

/// <summary>
/// Returns the refund to the client's balance, takes the rest out of held credits and creates the expert's
/// pending payout, in one transaction. A settled escrow counts as done, so a retry never pays twice.
/// </summary>
public sealed class SettleCaseEscrowHandler(
    IEscrowRepository escrows,
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    ISettlementRepository settlements,
    IBankAccountRepository bankAccounts,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SettleCaseEscrowCommand>
{
    public async Task HandleAsync(SettleCaseEscrowCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        // Same lock order as the payment webhook: the row first, then the user
        var escrow =
            await escrows.LockByReviewCaseAsync(command.ReviewCaseId, ct)
            ?? throw BillingErrors.EscrowNotFound();
        if (escrow.Status == EscrowStatus.Released)
        {
            return;
        }
        var now = clock.GetUtcNow();
        var settlement = Settlement.ForSplit(
            escrow,
            command.UserRefund,
            command.PlatformFee,
            command.ExpertPayout,
            now
        );
        escrow.Release(now);

        await userLock.AcquireAsync(escrow.UserId, ct);
        var wallet =
            await wallets.FindForUpdateAsync(escrow.UserId, ct)
            ?? throw new InvalidOperationException($"Escrow {escrow.Id} has no wallet.");
        if (command.UserRefund > 0)
        {
            wallet.RefundHeld(command.UserRefund, now);
            ledger.Add(CreditLedger.EscrowRefund(wallet, escrow, command.UserRefund, now));
        }
        var kept = escrow.Amount - command.UserRefund;
        if (kept > 0)
        {
            wallet.ReleaseHeld(kept, now);
            ledger.Add(CreditLedger.EscrowRelease(wallet, escrow, now));
        }
        if (settlement.ExpertPayoutAmount > 0)
        {
            var accounts = await bankAccounts.ListAsync(command.ExpertUserId, ct);
            var account = accounts.FirstOrDefault(x => x.IsDefault);
            settlement.PayoutTransactions.Add(
                PayoutTransaction.ToExpert(settlement, command.ExpertUserId, account, now)
            );
        }
        settlements.Add(settlement);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
