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
        Assert.Equal(
            "BANK_ACCOUNT_NOT_FOUND",
            Errors.CodeOf(() => account.Verify(Guid.NewGuid(), Now))
        );
    }

    [Fact]
    public void Staff_review_is_a_single_decision_recorded_with_who_and_when()
    {
        var staff = Guid.NewGuid();
        var later = Now.AddHours(1);
        var verified = Register(isDefault: true);
        verified.Verify(staff, later);

        Assert.True(verified.IsVerified);
        Assert.Equal((staff, later), (verified.VerifiedBy, verified.VerifiedAt));
        Assert.Equal(
            "BANK_ACCOUNT_ALREADY_REVIEWED",
            Errors.CodeOf(() => verified.Reject(staff, "late", later))
        );

        var rejected = Register(isDefault: false);
        rejected.Reject(staff, "  Tên chủ tài khoản khác họ tên đăng ký  ", later);

        Assert.Equal(BankAccountStatus.Rejected, rejected.Status);
        Assert.Equal("Tên chủ tài khoản khác họ tên đăng ký", rejected.RejectionReason);
        Assert.False(rejected.IsVerified);
        Assert.Equal(
            "BANK_ACCOUNT_ALREADY_REVIEWED",
            Errors.CodeOf(() => rejected.Verify(staff, later))
        );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void A_rejection_needs_a_reason(string? reason) =>
        Assert.Equal(
            "INVALID_BANK_ACCOUNT",
            Errors.CodeOf(() => Register(isDefault: true).Reject(Guid.NewGuid(), reason, Now))
        );

    [Fact]
    public void Staff_cannot_review_their_own_account() =>
        Assert.Equal(
            "BANK_ACCOUNT_SELF_REVIEW",
            Errors.CodeOf(() => Register(isDefault: true).Verify(Owner, Now))
        );
}
