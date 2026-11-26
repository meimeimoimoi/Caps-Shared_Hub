using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff send a PENDING or FAILED payout to the expert's bank account.</summary>
public sealed record TransferPayoutCommand(Guid PayoutId);

/// <summary>
/// Sends the transfer through the provider. The attempt is committed as PROCESSING before the call, so a lost
/// answer can be resolved later by <see cref="RefreshPayoutHandler"/> and never becomes a second transfer.
/// A payout without a usable account (none, or the expert removed it) takes the expert's current default.
/// </summary>
public sealed class TransferPayoutHandler(
    IPayoutRepository payouts,
    IBankAccountRepository bankAccounts,
    IAccountNumberProtector protector,
    IPayoutGateway gateway,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<TransferPayoutCommand, PayoutResponse>
{
    /// <summary>Shown on the expert's bank statement; plain ASCII, as banks may drop diacritics.</summary>
    public const string Description = "CAPS chi tra chuyen gia";

    public async Task<PayoutResponse> HandleAsync(
        TransferPayoutCommand command,
        CancellationToken ct
    )
    {
        if (!gateway.IsAvailable)
            throw BillingErrors.PaymentUnavailable();

        PayoutTransaction payout;
        string accountNumber;
        await using (var tx = await unitOfWork.BeginTransactionAsync(ct))
        {
            payout =
                await payouts.LockAsync(command.PayoutId, ct)
                ?? throw BillingErrors.PayoutNotFound();
            if (!payout.CanTransfer)
                throw BillingErrors.PayoutNotTransferable();

            var now = clock.GetUtcNow();
            var accounts = await bankAccounts.ListAsync(payout.RecipientUserId, ct);
            var account =
                accounts.FirstOrDefault(x => x.Id == payout.BankAccountId)
                ?? accounts.FirstOrDefault(x => x.IsDefault)
                ?? throw BillingErrors.PayoutNoBankAccount();
            if (account.Id != payout.BankAccountId)
                payout.UseAccount(account, now);
            payout.StartAttempt(now);
            accountNumber = protector.Reveal(account.AccountNumberEnc);
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        var submission = await gateway.SubmitAsync(
            new PayoutOrder(
                payout.Reference,
                payout.Amount,
                Description,
                payout.SnapBankBin!,
                accountNumber
            ),
            ct
        );
        var after = clock.GetUtcNow();
        if (submission.Accepted is { } report)
            payout.Apply(report.ProviderRef, report.Status, report.Error, after);
        else
            payout.Fail(submission.Refusal ?? "REFUSED", after);
        await unitOfWork.SaveChangesAsync(ct);
        return PayoutResponse.From(payout);
    }
}
