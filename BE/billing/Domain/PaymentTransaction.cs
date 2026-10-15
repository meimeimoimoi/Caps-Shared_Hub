using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>A payment through the payment provider (PayOS), for credits or a review case.</summary>
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
