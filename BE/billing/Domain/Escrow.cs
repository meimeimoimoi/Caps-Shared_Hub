using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>
/// Credits held from the payer's wallet for a review case until it ends: released to the expert or refunded.
/// One per review case; it leaves HELD exactly once.
/// </summary>
public sealed class Escrow
{
    private Escrow() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }
    public Guid ReviewCaseId { get; private set; }
    public long Amount { get; private set; }
    public string Status { get; private set; } = EscrowStatus.Held;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Starts holding; the caller moves the same amount from the wallet's balance to held.</summary>
    public static Escrow Hold(Guid userId, Guid reviewCaseId, long amount, DateTimeOffset now)
    {
        if (amount <= 0)
            throw BillingErrors.InvalidAmount();
        return new()
        {
            UserId = userId,
            ReviewCaseId = reviewCaseId,
            Amount = amount,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    public void Release(DateTimeOffset now) => Close(EscrowStatus.Released, now);

    public void Refund(DateTimeOffset now) => Close(EscrowStatus.Refunded, now);

    private void Close(string status, DateTimeOffset now)
    {
        if (Status != EscrowStatus.Held)
            throw BillingErrors.EscrowNotHeld();
        Status = status;
        UpdatedAt = now;
    }
}

/// <summary>Escrow states.</summary>
public static class EscrowStatus
{
    public const string Held = "HELD";
    public const string Released = "RELEASED";
    public const string Refunded = "REFUNDED";
}
