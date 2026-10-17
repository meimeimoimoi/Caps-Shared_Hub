namespace Caps.Billing.Domain;

/// <summary>A user's prepaid credits; Held is reserved for work in progress.</summary>
public sealed class CreditWallet
{
    public Guid UserId { get; set; }
    public long Balance { get; set; }
    public long Held { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
