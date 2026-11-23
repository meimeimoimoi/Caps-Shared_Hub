using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>Returns a held escrow to the payer's credits.</summary>
public sealed record RefundEscrowCommand(Guid ReviewCaseId);

/// <summary>Closes the escrow, moves the held credits back to the balance and records the settlement.</summary>
public sealed class RefundEscrowHandler(
    IEscrowRepository escrows,
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    ISettlementRepository settlements,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RefundEscrowCommand, SettlementResponse>
{
    public async Task<SettlementResponse> HandleAsync(
        RefundEscrowCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        // Same lock order as the payment webhook: the row first, then the user
        var escrow =
            await escrows.LockByReviewCaseAsync(command.ReviewCaseId, ct)
            ?? throw BillingErrors.EscrowNotFound();
        var now = clock.GetUtcNow();
        escrow.Refund(now);

        await userLock.AcquireAsync(escrow.UserId, ct);
        var wallet =
            await wallets.FindForUpdateAsync(escrow.UserId, ct)
            ?? throw new InvalidOperationException($"Escrow {escrow.Id} has no wallet.");
        wallet.RefundHeld(escrow.Amount, now);
        ledger.Add(CreditLedger.EscrowRefund(wallet, escrow, now));
        var settlement = Settlement.ForRefund(escrow, now);
        settlements.Add(settlement);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return SettlementResponse.From(settlement, escrow, null);
    }
}
