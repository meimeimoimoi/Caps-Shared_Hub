using Caps.Common.Database;

namespace billing.Entities;

public sealed class Escrow
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public long Amount { get; set; }
    public string Status { get; set; } = "HELD";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
