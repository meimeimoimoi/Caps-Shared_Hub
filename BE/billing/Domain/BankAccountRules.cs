namespace Caps.Billing.Domain;

/// <summary>Validation of bank account input, shared by the API and the domain.</summary>
public static class BankAccountRules
{
    /// <summary>Linked (not deleted) accounts allowed per user.</summary>
    public const int MaxAccounts = 5;

    public const int MaxNameLength = 128;

    private const int MinNumberLength = 6;
    private const int MaxNumberLength = 19;

    /// <summary>Digits only: spaces and dashes users type are removed; anything else is rejected.</summary>
    public static string NormalizeAccountNumber(string? accountNumber)
    {
        var digits = (accountNumber ?? "").Replace(" ", "").Replace("-", "");
        var valid =
            digits.Length is >= MinNumberLength and <= MaxNumberLength
            && digits.All(char.IsAsciiDigit);
        if (!valid)
            throw BillingErrors.InvalidBankAccount("accountNumber");
        return digits;
    }

    public static string Last4(string normalizedNumber) => normalizedNumber[^4..];

    /// <summary>BIN is the 6-digit bank code used by VietQR and PayOS payouts.</summary>
    public static BankAccountDetails Details(string? bankBin, string? bankName, string? holderName)
    {
        var bin = (bankBin ?? "").Trim();
        if (bin.Length != 6 || !bin.All(char.IsAsciiDigit))
            throw BillingErrors.InvalidBankAccount("bankBin");
        return new BankAccountDetails(
            bin,
            RequiredName(bankName, "bankName"),
            // Banks print holder names in upper case; storing them that way keeps comparisons simple
            RequiredName(holderName, "accountHolderName").ToUpperInvariant()
        );
    }

    private static string RequiredName(string? value, string field)
    {
        var trimmed = (value ?? "").Trim();
        if (trimmed.Length == 0 || trimmed.Length > MaxNameLength)
            throw BillingErrors.InvalidBankAccount(field);
        return trimmed;
    }
}
