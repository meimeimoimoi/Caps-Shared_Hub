using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>A payment through the payment provider (PayOS), for credits or a review case.</summary>
public sealed class PaymentTransaction
{
    private PaymentTransaction() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }

    // Set by the review fee (escrow) flow, which waits for review cases in workflow
    public Guid? ReviewCaseId { get; }
    public string Purpose { get; private set; } = default!;
    public long Amount { get; private set; }

    /// <summary>Credits added to the wallet when a top-up succeeds (the bought package's credits).</summary>
    public long Credits { get; private set; }
    public string Provider { get; } = PaymentProvider.PayOs;

    /// <summary>The provider's numeric order code, stored as text (unique).</summary>
    public string OrderCode { get; private set; } = default!;
    public string Status { get; private set; } = PaymentStatus.Pending;
    public DateTimeOffset? PaidAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsSucceeded => Status == PaymentStatus.Succeeded;

    /// <summary>Buys a credit package at its current price; later price changes do not affect this payment.</summary>
    public static PaymentTransaction StartTopup(
        Guid userId,
        CreditPackage package,
        long orderCode,
        DateTimeOffset now
    )
    {
        if (!package.IsForSale)
            throw BillingErrors.CreditPackageNotForSale();
        var amount = package.Price!.Value;
        PaymentRules.EnsureTopupAmount(amount);
        return new()
        {
            UserId = userId,
            Purpose = PaymentPurpose.CreditTopup,
            Amount = amount,
            Credits = package.Credits,
            OrderCode = orderCode.ToString(System.Globalization.CultureInfo.InvariantCulture),
            CreatedAt = now,
        };
    }

    /// <summary>
    /// The provider confirmed the money arrived. A FAILED payment can still succeed: the link may have been
    /// created even though its response was lost. The caller skips payments that already succeeded.
    /// </summary>
    public void MarkSucceeded(long paidAmount, DateTimeOffset now)
    {
        if (IsSucceeded)
            throw BillingErrors.PaymentAlreadySucceeded();
        if (paidAmount != Amount)
            throw BillingErrors.PaymentAmountMismatch();
        Status = PaymentStatus.Succeeded;
        PaidAt = now;
    }

    /// <summary>The payment link could not be created; nothing was charged.</summary>
    public void MarkFailed()
    {
        if (Status == PaymentStatus.Pending)
            Status = PaymentStatus.Failed;
    }
}

/// <summary>What a payment is for.</summary>
public static class PaymentPurpose
{
    public const string CreditTopup = "CREDIT_TOPUP";
}

/// <summary>Payment states.</summary>
public static class PaymentStatus
{
    public const string Pending = "PENDING";
    public const string Succeeded = "SUCCEEDED";
    public const string Failed = "FAILED";
}

/// <summary>Payment providers.</summary>
public static class PaymentProvider
{
    public const string PayOs = "PAYOS";
}
