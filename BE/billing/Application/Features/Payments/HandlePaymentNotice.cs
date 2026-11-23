using System.Globalization;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payments;

/// <summary>A raw notification body posted by the payment provider (webhook).</summary>
public sealed record HandlePaymentNoticeCommand(string Body);

/// <summary>
/// Credits the wallet once per paid order. Repeated or concurrent notifications are safe: the payment row is
/// locked, an already succeeded payment is skipped, and the ledger's idempotency key is unique.
/// Unknown orders (such as the provider's test notification) are acknowledged and ignored.
/// </summary>
public sealed class HandlePaymentNoticeHandler(
    IPaymentGateway gateway,
    IPaymentTransactionRepository payments,
    ICreditWalletRepository wallets,
    ICreditLedgerRepository ledger,
    IBillingUserLock userLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<HandlePaymentNoticeCommand>
{
    public async Task HandleAsync(HandlePaymentNoticeCommand command, CancellationToken ct)
    {
        var notice = gateway.ReadNotice(command.Body);
        if (!notice.Paid)
            return;

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
            // The ledger entry already exists: an earlier notification credited this order
            return;
        }
        await tx.CommitAsync(ct);
    }
}
