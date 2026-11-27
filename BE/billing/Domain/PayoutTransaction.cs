using System.Globalization;
using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>A transfer to an expert after settlement; bank details are copied at that moment.</summary>
public sealed class PayoutTransaction
{
    private PayoutTransaction() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid SettlementId { get; private set; }
    public Settlement Settlement { get; private set; } = default!;

    public string PayoutType { get; private set; } = default!;
    public Guid RecipientUserId { get; private set; }
    public long Amount { get; private set; }
    public Guid? BankAccountId { get; private set; }
    public BankAccount? BankAccount { get; }
    public string? SnapBankBin { get; private set; }
    public string? SnapBankName { get; private set; }
    public string? SnapAccountLast4 { get; private set; }
    public string? SnapHolderName { get; private set; }
    public string Provider { get; } = PaymentProvider.PayOs;

    /// <summary>The provider's payout id of the current attempt; null until the provider accepted it.</summary>
    public string? ProviderRef { get; private set; }
    public string Status { get; private set; } = PayoutStatus.Pending;
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }

    /// <summary>Not sent yet, or the last attempt failed: staff may (re)send it.</summary>
    public bool CanTransfer => Status is PayoutStatus.Pending or PayoutStatus.Failed;

    /// <summary>
    /// Reference and idempotency key of the current attempt: repeating one attempt never pays twice, a retry
    /// after a failure is a new transfer.
    /// </summary>
    public string Reference =>
        string.Create(CultureInfo.InvariantCulture, $"{Id:N}-{AttemptCount}");

    /// <summary>
    /// The expert's share of a settlement, waiting to be transferred. Without a bank account (the expert has
    /// no default one yet) the snapshot stays empty and is filled in when staff transfer it.
    /// </summary>
    public static PayoutTransaction ToExpert(
        Settlement settlement,
        Guid expertUserId,
        BankAccount? account,
        DateTimeOffset now
    )
    {
        var payout = new PayoutTransaction
        {
            SettlementId = settlement.Id,
            Settlement = settlement,
            PayoutType = Domain.PayoutType.ExpertPayout,
            RecipientUserId = expertUserId,
            Amount = settlement.ExpertPayoutAmount,
            CreatedAt = now,
            UpdatedAt = now,
        };
        if (account != null)
            payout.Snapshot(account);
        return payout;
    }

    /// <summary>Points a payout that is not being sent at another account of the recipient.</summary>
    public void UseAccount(BankAccount account, DateTimeOffset now)
    {
        if (!CanTransfer)
            throw BillingErrors.PayoutNotTransferable();
        if (account.UserId != RecipientUserId || account.IsDeleted)
            throw BillingErrors.PayoutNoBankAccount();
        Snapshot(account);
        UpdatedAt = now;
    }

    /// <summary>Opens a new attempt; it stays PROCESSING until the provider reports the outcome.</summary>
    public void StartAttempt(DateTimeOffset now)
    {
        if (!CanTransfer)
            throw BillingErrors.PayoutNotTransferable();
        if (BankAccountId == null)
            throw BillingErrors.PayoutNoBankAccount();
        AttemptCount++;
        Status = PayoutStatus.Processing;
        ProviderRef = null;
        LastError = null;
        UpdatedAt = now;
    }

    /// <summary>Records what the provider reports for the current attempt; ignored once it is settled.</summary>
    public void Apply(string providerRef, string status, string? error, DateTimeOffset now)
    {
        if (Status != PayoutStatus.Processing)
            return;
        ProviderRef = providerRef;
        Status = status;
        LastError = status == PayoutStatus.Failed ? error ?? "FAILED" : null;
        if (status == PayoutStatus.Succeeded)
            CompletedAt = now;
        UpdatedAt = now;
    }

    /// <summary>The provider refused the current attempt or never received it: staff may retry.</summary>
    public void Fail(string error, DateTimeOffset now)
    {
        if (Status != PayoutStatus.Processing)
            return;
        Status = PayoutStatus.Failed;
        LastError = error;
        UpdatedAt = now;
    }

    private void Snapshot(BankAccount account)
    {
        BankAccountId = account.Id;
        SnapBankBin = account.BankBin;
        SnapBankName = account.BankName;
        SnapAccountLast4 = account.AccountLast4;
        SnapHolderName = account.AccountHolderName;
    }
}

/// <summary>Kinds of payout.</summary>
public static class PayoutType
{
    public const string ExpertPayout = "EXPERT_PAYOUT";
}

/// <summary>Payout states: PENDING, then PROCESSING, then SUCCEEDED or FAILED (FAILED may be retried).</summary>
public static class PayoutStatus
{
    public const string Pending = "PENDING";
    public const string Processing = "PROCESSING";
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
}
