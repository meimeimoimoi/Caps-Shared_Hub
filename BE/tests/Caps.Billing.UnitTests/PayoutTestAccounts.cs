using System.Reflection;
using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

/// <summary>Bank accounts for payout tests, and the account navigation EF would load from the database.</summary>
internal static class PayoutTestAccounts
{
    public static BankAccount Account(
        Guid owner,
        DateTimeOffset at,
        bool verified,
        bool isDefault = true
    )
    {
        var account = BankAccount.Register(
            owner,
            new("970422", "Vietcombank", "NGUYEN VAN A"),
            new("enc:0123456789", "hash-" + Guid.NewGuid().ToString("N"), "6789"),
            isDefault,
            at,
            "expert@caps.test"
        );
        if (verified)
            account.Verify(Guid.NewGuid(), at);
        return account;
    }

    // EF fills the navigation on read (Include); tests set it the same way, without changing the domain
    public static PayoutTransaction WithAccount(this PayoutTransaction payout, BankAccount account)
    {
        typeof(PayoutTransaction)
            .GetField(
                "<BankAccount>k__BackingField",
                BindingFlags.Instance | BindingFlags.NonPublic
            )!
            .SetValue(payout, account);
        return payout;
    }
}
