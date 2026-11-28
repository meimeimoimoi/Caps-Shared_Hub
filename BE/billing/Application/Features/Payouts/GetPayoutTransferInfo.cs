using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Staff ask what to type into the banking app to pay a payout by hand.</summary>
public sealed record GetPayoutTransferInfoQuery(Guid PayoutId);

/// <summary>The full account the money goes to, the amount and a suggested transfer description.</summary>
public sealed record PayoutTransferInfoResponse(
    string PayoutId,
    string BankBin,
    string BankName,
    string AccountNumber,
    string AccountHolderName,
    long Amount,
    string Description
);

/// <summary>
/// Reads the account a manual transfer must go to (the same one a PayOS transfer would use) and reveals its
/// number, like the bank account review does. Read-only: nothing changes until staff confirm.
/// </summary>
public sealed class GetPayoutTransferInfoHandler(
    IPayoutRepository payouts,
    IBankAccountRepository bankAccounts,
    IAccountNumberProtector protector
) : IQueryHandler<GetPayoutTransferInfoQuery, PayoutTransferInfoResponse>
{
    public async Task<PayoutTransferInfoResponse> HandleAsync(
        GetPayoutTransferInfoQuery query,
        CancellationToken ct
    )
    {
        var payout =
            await payouts.GetAsync(query.PayoutId, ct) ?? throw BillingErrors.PayoutNotFound();
        if (!payout.CanTransfer)
            throw BillingErrors.PayoutNotTransferable();
        var account = await PayoutAccounts.PickAsync(bankAccounts, payout, ct);
        return new(
            payout.Id.ToString(),
            account.BankBin,
            account.BankName,
            protector.Reveal(account.AccountNumberEnc),
            account.AccountHolderName,
            payout.Amount,
            DescriptionOf(payout)
        );
    }

    /// <summary>
    /// Plain ASCII so banks keep it. The whole id: a UUIDv7 prefix is only a timestamp, so a short prefix would
    /// match several payouts settled the same minute.
    /// </summary>
    public static string DescriptionOf(PayoutTransaction payout) => $"CAPS {payout.Id:N}";
}
