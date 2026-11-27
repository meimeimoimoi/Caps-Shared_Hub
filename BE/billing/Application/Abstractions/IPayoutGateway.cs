namespace Caps.Billing.Application.Abstractions;

/// <summary>The provider's bank transfer (payout) channel (PayOS).</summary>
public interface IPayoutGateway
{
    /// <summary>False when the payout keys are not configured; nothing can be sent then.</summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Sends one transfer. A refusal (the transfer was not created) comes back as <see cref="PayoutSubmission.Refusal"/>;
    /// when the outcome is unknown (provider down, timeout, not configured) it throws PAYMENT_UNAVAILABLE.
    /// </summary>
    Task<PayoutSubmission> SubmitAsync(PayoutOrder order, CancellationToken ct);

    /// <summary>The transfer the provider created for <paramref name="reference"/>, or null when it has none.</summary>
    Task<PayoutReport?> FindAsync(string? providerRef, string reference, CancellationToken ct);
}
