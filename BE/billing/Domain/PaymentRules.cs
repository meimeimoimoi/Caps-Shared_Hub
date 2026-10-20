namespace Caps.Billing.Domain;

/// <summary>Limits of credit top-ups. Amounts are in VND; one VND buys one credit.</summary>
public static class PaymentRules
{
    public const long MinTopupAmount = 10_000;
    public const long MaxTopupAmount = 50_000_000;

    /// <summary>How long a payment link (and its QR code) can be paid.</summary>
    public static readonly TimeSpan LinkLifetime = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Transfer note shown in the banking app. Kept at most 9 characters, the limit PayOS applies to bank
    /// accounts not linked through PayOS.
    /// </summary>
    public const string TopupDescription = "CAPS NAP";

    public static void EnsureTopupAmount(long amount)
    {
        if (amount is < MinTopupAmount or > MaxTopupAmount)
            throw BillingErrors.InvalidTopupAmount(MinTopupAmount, MaxTopupAmount);
    }
}
