using Caps.Common.Database;

namespace billing.Entities;

public sealed class PaymentTransaction
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public Guid? ReviewCaseId { get; set; }
    public string Purpose { get; set; } = default!;
    public long Amount { get; set; }
    public string Provider { get; set; } = "PAYOS";
    public string OrderCode { get; set; } = default!;
    public string Status { get; set; } = "PENDING";
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
