namespace Caps.Billing.Domain;

/// <summary>A user's prepaid credits; Held is reserved for work in progress.</summary>
public sealed class CreditWallet
{
    private CreditWallet() { }

    public Guid UserId { get; private set; }
    public long Balance { get; private set; }
    public long Held { get; private set; }
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

    /// <summary>Reserves credits for an escrow: they leave the balance but stay in the wallet as held.</summary>
    public void Hold(long amount, DateTimeOffset now)
    {
        if (amount <= 0)
            throw BillingErrors.InvalidAmount();
        if (Balance < amount)
            throw BillingErrors.InsufficientCredits();
        Balance -= amount;
        Held = checked(Held + amount);
        UpdatedAt = now;
    }

    /// <summary>Held credits leave the wallet (paid to the expert and the platform).</summary>
    public void ReleaseHeld(long amount, DateTimeOffset now)
    {
        TakeHeld(amount);
        UpdatedAt = now;
    }

    /// <summary>Held credits go back to the balance.</summary>
    public void RefundHeld(long amount, DateTimeOffset now)
    {
        TakeHeld(amount);
        Balance = checked(Balance + amount);
        UpdatedAt = now;
    }

    private void TakeHeld(long amount)
    {
        if (amount <= 0 || amount > Held)
            throw BillingErrors.InvalidAmount();
        Held -= amount;
    }
}
