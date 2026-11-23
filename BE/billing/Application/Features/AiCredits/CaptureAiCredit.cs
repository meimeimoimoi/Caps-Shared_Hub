using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.AiCredits;

/// <summary>Captures previously held AI credits once the AI response is completed.</summary>
public sealed record CaptureAiCreditCommand(Guid AiUsageId, Guid? DocumentVersionId, string? Note);

/// <summary>Finalizes held AI credits; repeating capture for the same AI usage succeeds idempotently.</summary>
public sealed class CaptureAiCreditHandler(
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<CaptureAiCreditCommand>
{
    public Task HandleAsync(CaptureAiCreditCommand command, CancellationToken ct) =>
        AiCreditSettlement.SettleAsync(
            command.AiUsageId,
            CreditLedger.AiCaptureKey(command.AiUsageId),
            CreditLedger.AiReleaseKey(command.AiUsageId),
            static (wallet, amount, now) => wallet.ReleaseHeld(amount, now),
            (wallet, amount, now) =>
                CreditLedger.AiCapture(
                    wallet,
                    command.AiUsageId,
                    command.DocumentVersionId,
                    amount,
                    command.Note,
                    now
                ),
            ledger,
            wallets,
            userLock,
            unitOfWork,
            clock,
            ct
        );
}
