using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.AiCredits;

/// <summary>Shared hold settlement step for AI usage capture and release.</summary>
internal static class AiCreditSettlement
{
    public static async Task SettleAsync(
        Guid aiUsageId,
        string targetKey,
        string conflictingKey,
        Action<CreditWallet, long, DateTimeOffset> mutateWallet,
        Func<CreditWallet, long, DateTimeOffset, CreditLedger> createLedger,
        ICreditLedgerRepository ledger,
        ICreditWalletRepository wallets,
        IBillingUserLock userLock,
        IUnitOfWork unitOfWork,
        TimeProvider clock,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var hold =
            await ledger.FindByIdempotencyKeyAsync(CreditLedger.AiHoldKey(aiUsageId), ct)
            ?? throw BillingErrors.AiCreditHoldNotFound();

        await userLock.AcquireAsync(hold.UserId, ct);
        if (await ledger.FindByIdempotencyKeyAsync(targetKey, ct) is not null)
        {
            return;
        }

        if (await ledger.FindByIdempotencyKeyAsync(conflictingKey, ct) is not null)
        {
            throw BillingErrors.AiCreditHoldClosed();
        }

        var wallet =
            await wallets.FindForUpdateAsync(hold.UserId, ct)
            ?? throw new InvalidOperationException($"AI credit hold {aiUsageId} has no wallet.");
        var heldAmount = -hold.Amount;
        var now = clock.GetUtcNow();

        mutateWallet(wallet, heldAmount, now);
        ledger.Add(createLedger(wallet, heldAmount, now));

        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
