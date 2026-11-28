using System.Globalization;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Common;

/// <summary>
/// Shared by the payment webhook and the top-up status poll. Repeated or concurrent calls are safe: the payment
/// row is locked, an already succeeded payment is skipped, and the ledger's idempotency key is unique.
/// </summary>
public sealed class TopupCrediting(
    IPaymentTransactionRepository payments,
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ITopupCrediting
{
    public async Task CreditAsync(PaymentNotice notice, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var payment = await payments.LockByOrderCodeAsync(
            notice.OrderCode.ToString(CultureInfo.InvariantCulture),
            ct
        );
        // Review fees are settled once escrow exists; until then only top-ups are credited
        if (payment is not { IsSucceeded: false, Purpose: PaymentPurpose.CreditTopup })
            return;

        var now = clock.GetUtcNow();
        payment.MarkSucceeded(notice.Amount, now);
        await userLock.AcquireAsync(payment.UserId, ct);
        var wallet = await wallets.FindForUpdateAsync(payment.UserId, ct);
        if (wallet == null)
        {
            wallet = CreditWallet.Open(payment.UserId, now);
            wallets.Add(wallet);
        }
        wallet.Credit(payment.Amount, now);
        ledger.Add(CreditLedger.Topup(wallet, payment, now));
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // The ledger entry already exists: an earlier call credited this order
            return;
        }
        await tx.CommitAsync(ct);
    }
}
