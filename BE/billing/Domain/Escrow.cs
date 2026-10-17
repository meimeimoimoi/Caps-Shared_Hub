using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>Money held for a review case until it is settled.</summary>
public sealed class Escrow
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public long Amount { get; set; }
    public string Status { get; set; } = "HELD";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
