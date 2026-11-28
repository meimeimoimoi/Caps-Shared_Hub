using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;

namespace Caps.Billing.Application.Common;

/// <summary>
/// Which account a payout is paid to: the snapshot account when it is still linked and verified, otherwise the
/// expert's verified default. Only staff-VERIFIED accounts ever receive money.
/// </summary>
public static class PayoutAccounts
{
    public static async Task<BankAccount> PickAsync(
        IBankAccountRepository bankAccounts,
        PayoutTransaction payout,
        CancellationToken ct
    )
    {
        var accounts = await bankAccounts.ListAsync(payout.RecipientUserId, ct);
        return accounts.FirstOrDefault(x => x.Id == payout.BankAccountId && x.IsVerified)
            ?? accounts.FirstOrDefault(x => x.IsDefault && x.IsVerified)
            ?? throw (
                accounts.Count == 0
                    ? BillingErrors.PayoutNoBankAccount()
                    : BillingErrors.PayoutAccountNotVerified()
            );
    }

    /// <summary>Points the payout at the picked account; true when it changed (an exhausted payout may retry).</summary>
    public static bool Use(PayoutTransaction payout, BankAccount account, DateTimeOffset now)
    {
        if (account.Id == payout.BankAccountId)
            return false;
        payout.UseAccount(account, now);
        return true;
    }
}
