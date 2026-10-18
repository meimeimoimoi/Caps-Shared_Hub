using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>An expert's payout bank account; the number is stored encrypted, plus a hash and the last 4 digits.</summary>
public sealed class BankAccount
{
    private BankAccount() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }
    public string BankBin { get; private set; } = default!;
    public string BankName { get; private set; } = default!;
    public string AccountNumberEnc { get; private set; } = default!;
    public string AccountNumberHash { get; private set; } = default!;
    public string AccountLast4 { get; private set; } = default!;
    public string AccountHolderName { get; private set; } = default!;
    public bool IsDefault { get; private set; }

    // Set by the staff verification flow, which is not built yet
    public string Status { get; } = BankAccountStatus.Unverified;
    public string? RejectionReason { get; }
    public Guid? VerifiedBy { get; }
    public DateTimeOffset? VerifiedAt { get; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsDeleted => DeletedAt != null;

    /// <summary>
    /// Links a new account. The caller has already validated and protected the number
    /// (see <see cref="BankAccountRules"/>); it never reaches the entity in clear text.
    /// </summary>
    public static BankAccount Register(
        Guid userId,
        BankAccountDetails details,
        ProtectedAccountNumber number,
        bool isDefault,
        DateTimeOffset now
    ) =>
        new()
        {
            UserId = userId,
            BankBin = details.BankBin,
            BankName = details.BankName,
            AccountHolderName = details.AccountHolderName,
            AccountNumberEnc = number.Encrypted,
            AccountNumberHash = number.Hash,
            AccountLast4 = number.Last4,
            IsDefault = isDefault,
            CreatedAt = now,
            UpdatedAt = now,
        };

    public void MakeDefault(DateTimeOffset now)
    {
        EnsureActive();
        if (IsDefault)
            return;
        IsDefault = true;
        UpdatedAt = now;
    }

    public void ClearDefault(DateTimeOffset now)
    {
        if (!IsDefault)
            return;
        IsDefault = false;
        UpdatedAt = now;
    }

    /// <summary>Soft delete: payouts keep pointing at the row; a deleted account is never the default.</summary>
    public void Delete(DateTimeOffset now)
    {
        EnsureActive();
        IsDefault = false;
        DeletedAt = now;
        UpdatedAt = now;
    }

    private void EnsureActive()
    {
        if (IsDeleted)
            throw BillingErrors.BankAccountNotFound();
    }
}

/// <summary>Bank and holder of an account, already validated by <see cref="BankAccountRules"/>.</summary>
public sealed record BankAccountDetails(string BankBin, string BankName, string AccountHolderName);

/// <summary>An account number as stored: encrypted, hashed for duplicate checks, and its last 4 digits.</summary>
public sealed record ProtectedAccountNumber(string Encrypted, string Hash, string Last4);

/// <summary>Verification states of a bank account.</summary>
public static class BankAccountStatus
{
    public const string Unverified = "UNVERIFIED";
}
