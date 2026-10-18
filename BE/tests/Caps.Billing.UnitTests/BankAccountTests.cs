using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

public sealed class BankAccountTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Owner = Guid.NewGuid();

    private static BankAccount Register(bool isDefault) =>
        BankAccount.Register(
            Owner,
            new BankAccountDetails("970436", "Vietcombank", "NGUYEN VAN A"),
            new ProtectedAccountNumber("cipher", "hash", "2345"),
            isDefault,
            Now
        );

    [Fact]
    public void A_new_account_is_unverified_and_keeps_only_protected_number_parts()
    {
        var account = Register(isDefault: true);

        Assert.Equal(Owner, account.UserId);
        Assert.True(account.IsDefault);
        Assert.Equal(BankAccountStatus.Unverified, account.Status);
        Assert.Equal("cipher", account.AccountNumberEnc);
        Assert.Equal("hash", account.AccountNumberHash);
        Assert.Equal("2345", account.AccountLast4);
        Assert.Equal(Now, account.CreatedAt);
        Assert.False(account.IsDeleted);
    }

    [Fact]
    public void The_default_can_move_between_accounts()
    {
        var later = Now.AddMinutes(5);
        var account = Register(isDefault: false);

        account.MakeDefault(later);
        Assert.True(account.IsDefault);
        Assert.Equal(later, account.UpdatedAt);

        account.ClearDefault(later);
        Assert.False(account.IsDefault);
    }

    [Fact]
    public void Deleting_clears_the_default_and_keeps_the_row()
    {
        var later = Now.AddMinutes(5);
        var account = Register(isDefault: true);

        account.Delete(later);

        Assert.True(account.IsDeleted);
        Assert.Equal(later, account.DeletedAt);
        Assert.False(account.IsDefault);
    }

    [Fact]
    public void A_deleted_account_cannot_be_deleted_again_or_become_default()
    {
        var account = Register(isDefault: false);
        account.Delete(Now);

        Assert.Equal("BANK_ACCOUNT_NOT_FOUND", Errors.CodeOf(() => account.Delete(Now)));
        Assert.Equal("BANK_ACCOUNT_NOT_FOUND", Errors.CodeOf(() => account.MakeDefault(Now)));
    }
}
