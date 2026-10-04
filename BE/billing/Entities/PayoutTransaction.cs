using Caps.Common.Database;

namespace billing.Entities;

public sealed class PayoutTransaction
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid SettlementId { get; set; }
    public Settlement Settlement { get; set; } = default!;

    public string PayoutType { get; set; } = default!;
    public Guid RecipientUserId { get; set; }
    public long Amount { get; set; }
    public Guid? BankAccountId { get; set; }
    public BankAccount? BankAccount { get; set; }
    public string? SnapBankBin { get; set; }
    public string? SnapBankName { get; set; }
    public string? SnapAccountLast4 { get; set; }
    public string? SnapHolderName { get; set; }
    public string Provider { get; set; } = "PAYOS";
    public string? ProviderRef { get; set; }
    public string Status { get; set; } = "PENDING";
    public int AttemptCount { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}
