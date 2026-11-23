using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>Holds credits from the payer's wallet for a review case.</summary>
public sealed record HoldEscrowCommand(Guid UserId, Guid ReviewCaseId, long Amount);

/// <summary>
/// Moves the amount from the balance to held and opens the escrow, once per review case.
/// No endpoint yet: the amount must come from workflow (the case's fee), never from the client.
/// </summary>
public sealed class HoldEscrowHandler(
    IEscrowRepository escrows,
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<HoldEscrowCommand, EscrowResponse>
{
    public async Task<EscrowResponse> HandleAsync(HoldEscrowCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        if (await escrows.LockByReviewCaseAsync(command.ReviewCaseId, ct) != null)
            throw BillingErrors.EscrowAlreadyExists();

        var now = clock.GetUtcNow();
        await userLock.AcquireAsync(command.UserId, ct);
        var wallet =
            await wallets.FindForUpdateAsync(command.UserId, ct)
            ?? throw BillingErrors.InsufficientCredits();
        var escrow = Escrow.Hold(command.UserId, command.ReviewCaseId, command.Amount, now);
        wallet.Hold(escrow.Amount, now);
        escrows.Add(escrow);
        ledger.Add(CreditLedger.EscrowHold(wallet, escrow, now));
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // A concurrent hold for the same review case committed first
            throw BillingErrors.EscrowAlreadyExists();
        }
        await tx.CommitAsync(ct);
        return EscrowResponse.From(escrow);
    }
}
