using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>An expert's payout bank account; the number is stored encrypted, plus a hash and the last 4 digits.</summary>
public sealed class BankAccount
{
    public const int MaxRejectionReasonLength = 500;

    private BankAccount() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }

    /// <summary>The expert's sign-in email when they linked the account, for review notices; null if unknown.</summary>
    public string? OwnerEmail { get; private set; }
    public string BankBin { get; private set; } = default!;
    public string BankName { get; private set; } = default!;
    public string AccountNumberEnc { get; private set; } = default!;
    public string AccountNumberHash { get; private set; } = default!;
    public string AccountLast4 { get; private set; } = default!;
    public string AccountHolderName { get; private set; } = default!;
    public bool IsDefault { get; private set; }

    /// <summary>Set once by staff review; payouts are only sent to VERIFIED accounts.</summary>
    public string Status { get; private set; } = BankAccountStatus.Unverified;
    public string? RejectionReason { get; private set; }

    /// <summary>The staff member who reviewed the account and when, whether verified or rejected.</summary>
    public Guid? VerifiedBy { get; private set; }
    public DateTimeOffset? VerifiedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsDeleted => DeletedAt != null;
    public bool IsVerified => Status == BankAccountStatus.Verified;

    /// <summary>
    /// Links a new account. The caller has already validated and protected the number
    /// (see <see cref="BankAccountRules"/>); it never reaches the entity in clear text.
    /// </summary>
    public static BankAccount Register(
        Guid userId,
        BankAccountDetails details,
        ProtectedAccountNumber number,
        bool isDefault,
        DateTimeOffset now,
        string? ownerEmail = null
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
            OwnerEmail = ownerEmail,
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

    /// <summary>Staff confirmed the account belongs to the expert (holder name matches their registered name).</summary>
    public void Verify(Guid staffId, DateTimeOffset now) =>
        Review(staffId, BankAccountStatus.Verified, null, now);

    /// <summary>Staff refused the account; the expert sees the reason and links another one.</summary>
    public void Reject(Guid staffId, string? reason, DateTimeOffset now)
    {
        var trimmed = reason?.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.Length > MaxRejectionReasonLength)
            throw BillingErrors.InvalidBankAccount("reason");
        Review(staffId, BankAccountStatus.Rejected, trimmed, now);
    }

    private void Review(Guid staffId, string status, string? reason, DateTimeOffset now)
    {
        EnsureActive();
        // Separation of duties: staff who are also experts cannot approve their own payout account
        if (staffId == UserId)
            throw BillingErrors.BankAccountSelfReview();
        if (Status != BankAccountStatus.Unverified)
            throw BillingErrors.BankAccountAlreadyReviewed();
        Status = status;
        RejectionReason = reason;
        VerifiedBy = staffId;
        VerifiedAt = now;
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
    public const string Verified = "VERIFIED";
    public const string Rejected = "REJECTED";
}
