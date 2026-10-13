using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>A complaint about a review case, decided by an arbiter before the deadline (SLA).</summary>
public sealed class Dispute
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public Guid RaisedBy { get; set; }
    public string Grounds { get; set; } = default!;
    public string? Evidence { get; set; } // jsonb
    public Guid? ArbiterUserId { get; set; }
    public DateTimeOffset SlaDueAt { get; set; }
    public string? Outcome { get; set; }
    public string? ResolutionNote { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAt { get; set; }
}
