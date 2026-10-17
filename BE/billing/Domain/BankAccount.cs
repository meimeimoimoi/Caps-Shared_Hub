using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>An expert's payout bank account; the number is stored encrypted, plus a hash and the last 4 digits.</summary>
public sealed class BankAccount
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public string BankBin { get; set; } = default!;
    public string BankName { get; set; } = default!;
    public string AccountNumberEnc { get; set; } = default!;
    public string AccountNumberHash { get; set; } = default!;
    public string AccountLast4 { get; set; } = default!;
    public string AccountHolderName { get; set; } = default!;
    public bool IsDefault { get; set; }
    public string Status { get; set; } = "UNVERIFIED";
    public string? RejectionReason { get; set; }
    public Guid? VerifiedBy { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
