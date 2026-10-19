using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>Pays a held escrow to the expert, minus the platform fee.</summary>
public sealed record ReleaseEscrowCommand(Guid ReviewCaseId, Guid ExpertUserId, int PlatformFeePct);

/// <summary>
/// Closes the escrow, takes the held credits out of the payer's wallet, records the settlement and creates a
/// pending payout to the expert's default bank account (none yet: staff fill it in before transferring).
/// </summary>
public sealed class ReleaseEscrowHandler(
    IEscrowRepository escrows,
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    ISettlementRepository settlements,
    IBankAccountRepository bankAccounts,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ReleaseEscrowCommand, SettlementResponse>
{
    public async Task<SettlementResponse> HandleAsync(
        ReleaseEscrowCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        // Same lock order as the payment webhook: the row first, then the user
        var escrow =
            await escrows.LockByReviewCaseAsync(command.ReviewCaseId, ct)
            ?? throw BillingErrors.EscrowNotFound();
        var now = clock.GetUtcNow();
        escrow.Release(now);
        var settlement = Settlement.ForRelease(escrow, command.PlatformFeePct, now);

        await userLock.AcquireAsync(escrow.UserId, ct);
        var wallet =
            await wallets.FindForUpdateAsync(escrow.UserId, ct)
            ?? throw new InvalidOperationException($"Escrow {escrow.Id} has no wallet.");
        wallet.ReleaseHeld(escrow.Amount, now);
        ledger.Add(CreditLedger.EscrowRelease(wallet, escrow, now));

        PayoutTransaction? payout = null;
        if (settlement.ExpertPayoutAmount > 0)
        {
            var accounts = await bankAccounts.ListAsync(command.ExpertUserId, ct);
            var account = accounts.FirstOrDefault(x => x.IsDefault);
            payout = PayoutTransaction.ToExpert(settlement, command.ExpertUserId, account, now);
            settlement.PayoutTransactions.Add(payout);
        }
        settlements.Add(settlement);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return SettlementResponse.From(settlement, escrow, payout);
    }
}
