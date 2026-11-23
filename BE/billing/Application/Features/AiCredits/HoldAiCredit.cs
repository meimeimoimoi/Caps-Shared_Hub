using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.AiCredits;

/// <summary>Holds credits from the user's wallet while an AI operation is processed.</summary>
public sealed record HoldAiCreditCommand(Guid UserId, Guid AiUsageId, long Amount, string? Note);

/// <summary>
/// Reserves credits once per AI usage id; repeating the exact same hold succeeds so network retries are safe.
/// </summary>
public sealed class HoldAiCreditHandler(
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<HoldAiCreditCommand>
{
    public async Task HandleAsync(HoldAiCreditCommand command, CancellationToken ct)
    {
        if (command.Amount <= 0)
        {
            throw BillingErrors.InvalidAmount();
        }

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await userLock.AcquireAsync(command.UserId, ct);

        var holdKey = CreditLedger.AiHoldKey(command.AiUsageId);
        var existingHold = await ledger.FindByIdempotencyKeyAsync(holdKey, ct);
        if (existingHold is not null)
        {
            await EnsureIdempotentHoldAsync(existingHold, command, ct);
            return;
        }

        var wallet =
            await wallets.FindForUpdateAsync(command.UserId, ct)
            ?? throw BillingErrors.InsufficientCredits();
        var now = clock.GetUtcNow();
        wallet.Hold(command.Amount, now);
        ledger.Add(
            CreditLedger.AiHold(wallet, command.AiUsageId, command.Amount, command.Note, now)
        );

        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            var racedHold = await ledger.FindByIdempotencyKeyAsync(holdKey, ct);
            if (racedHold is not null)
            {
                await EnsureIdempotentHoldAsync(racedHold, command, ct);
                return;
            }

            throw BillingErrors.AiCreditHoldConflict();
        }

        await tx.CommitAsync(ct);
    }

    private async Task EnsureIdempotentHoldAsync(
        CreditLedger existingHold,
        HoldAiCreditCommand command,
        CancellationToken ct
    )
    {
        if (existingHold.UserId != command.UserId || existingHold.Amount != -command.Amount)
        {
            throw BillingErrors.AiCreditHoldConflict();
        }

        if (
            await ledger.FindByIdempotencyKeyAsync(CreditLedger.AiCaptureKey(command.AiUsageId), ct)
                is not null
            || await ledger.FindByIdempotencyKeyAsync(
                CreditLedger.AiReleaseKey(command.AiUsageId),
                ct
            )
                is not null
        )
        {
            throw BillingErrors.AiCreditHoldClosed();
        }
    }
}
