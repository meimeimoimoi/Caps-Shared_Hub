using Caps.Common.Database;

namespace billing.Entities;

public sealed class CreditLedger
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public string EntryType { get; set; } = default!;
    public long Amount { get; set; }
    public long BalanceAfter { get; set; }
    public string IdempotencyKey { get; set; } = default!;
    public Guid? RefPaymentId { get; set; }
    public PaymentTransaction? PaymentTransaction { get; set; }
    public Guid? RefAiUsageId { get; set; }
    public Guid? RefDocumentVersionId { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
