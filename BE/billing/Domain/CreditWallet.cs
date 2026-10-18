namespace Caps.Billing.Domain;

/// <summary>A user's prepaid credits; Held is reserved for work in progress.</summary>
public sealed class CreditWallet
{
    private CreditWallet() { }

    public Guid UserId { get; private set; }
    public long Balance { get; private set; }

    // Changed by the hold/capture flow of review cases, which is not built yet
    public long Held { get; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>An empty wallet, created on the first credit (reading never creates one).</summary>
    public static CreditWallet Open(Guid userId, DateTimeOffset now) =>
        new() { UserId = userId, UpdatedAt = now };

    /// <summary>Adds credits; the caller records the matching ledger entry with the new balance.</summary>
    public void Credit(long amount, DateTimeOffset now)
    {
        if (amount <= 0)
            throw BillingErrors.InvalidAmount();
        Balance = checked(Balance + amount);
        UpdatedAt = now;
    }
}
