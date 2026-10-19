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
    public string Provider { get; private set; } = PaymentProvider.PayOs;

    // Set by the transfer flow (PayOS payouts), which is not built yet
    public string? ProviderRef { get; }
    public string Status { get; private set; } = PayoutStatus.Pending;
    public int AttemptCount { get; }
    public string? LastError { get; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; }

    /// <summary>
    /// The expert's share of a settlement, waiting to be transferred. Without a bank account (the expert has
    /// no default one yet) the snapshot stays empty and staff complete it before transferring.
    /// </summary>
    public static PayoutTransaction ToExpert(
        Settlement settlement,
        Guid expertUserId,
        BankAccount? account,
        DateTimeOffset now
    ) =>
        new()
        {
            SettlementId = settlement.Id,
            Settlement = settlement,
            PayoutType = Domain.PayoutType.ExpertPayout,
            RecipientUserId = expertUserId,
            Amount = settlement.ExpertPayoutAmount,
            BankAccountId = account?.Id,
            SnapBankBin = account?.BankBin,
            SnapBankName = account?.BankName,
            SnapAccountLast4 = account?.AccountLast4,
            SnapHolderName = account?.AccountHolderName,
            CreatedAt = now,
            UpdatedAt = now,
        };
}

/// <summary>Kinds of payout.</summary>
public static class PayoutType
{
    public const string ExpertPayout = "EXPERT_PAYOUT";
}

/// <summary>Payout states.</summary>
public static class PayoutStatus
{
    public const string Pending = "PENDING";
}
