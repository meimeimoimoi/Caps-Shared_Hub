using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

public sealed class BankAccountRulesTests
{
    [Theory]
    [InlineData("0071 0000 12345", "0071000012345")]
    [InlineData("123-456-789", "123456789")]
    [InlineData("123456", "123456")]
    public void Account_numbers_keep_only_digits(string input, string expected) =>
        Assert.Equal(expected, BankAccountRules.NormalizeAccountNumber(input));

    [Theory]
    [InlineData(null)]
    [InlineData("12345")]
    [InlineData("12345678901234567890")]
    [InlineData("12345a789")]
    [InlineData("１２３４５６")]
    public void Invalid_account_numbers_are_rejected(string? input) =>
        Assert.Equal(
            "INVALID_BANK_ACCOUNT",
            Errors.CodeOf(() => BankAccountRules.NormalizeAccountNumber(input))
        );

    [Fact]
    public void Last4_is_the_end_of_the_number() =>
        Assert.Equal("2345", BankAccountRules.Last4("0071000012345"));

    [Fact]
    public void Details_are_trimmed_and_the_holder_is_upper_case()
    {
        var details = BankAccountRules.Details(" 970436 ", " Vietcombank ", " nguyen van a ");

        Assert.Equal(new BankAccountDetails("970436", "Vietcombank", "NGUYEN VAN A"), details);
    }

    [Theory]
    [InlineData("97043", "Vietcombank", "A")]
    [InlineData("97043X", "Vietcombank", "A")]
    [InlineData("970436", " ", "A")]
    [InlineData("970436", "Vietcombank", null)]
    public void Missing_or_malformed_details_are_rejected(
        string bin,
        string? bankName,
        string? holder
    ) =>
        Assert.Equal(
            "INVALID_BANK_ACCOUNT",
            Errors.CodeOf(() => BankAccountRules.Details(bin, bankName, holder))
        );
}
