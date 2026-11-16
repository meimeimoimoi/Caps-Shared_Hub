using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.AiCredits;

/// <summary>Returns held AI credits to the user's balance when an AI operation is refunded or fails.</summary>
public sealed record ReleaseAiCreditCommand(Guid AiUsageId, string? Note);

/// <summary>Releases held AI credits; repeating release for the same AI usage succeeds idempotently.</summary>
public sealed class ReleaseAiCreditHandler(
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ReleaseAiCreditCommand>
{
    public Task HandleAsync(ReleaseAiCreditCommand command, CancellationToken ct) =>
        AiCreditSettlement.SettleAsync(
            command.AiUsageId,
            CreditLedger.AiReleaseKey(command.AiUsageId),
            CreditLedger.AiCaptureKey(command.AiUsageId),
            static (wallet, amount, now) => wallet.RefundHeld(amount, now),
            (wallet, amount, now) =>
                CreditLedger.AiRelease(wallet, command.AiUsageId, amount, command.Note, now),
            ledger,
            wallets,
            userLock,
            unitOfWork,
            clock,
            ct
        );
}
