namespace Caps.Billing.Application.Abstractions;

/// <summary>One bank transfer; <paramref name="Reference"/> is also its idempotency key.</summary>
public sealed record PayoutOrder(
    string Reference,
    long Amount,
    string Description,
    string BankBin,
    string AccountNumber
);

/// <summary>The provider's view of a transfer, with <paramref name="Status"/> mapped to a PayoutStatus value.</summary>
public sealed record PayoutReport(string ProviderRef, string Status, string? Error);

/// <summary>Either the accepted transfer or why the provider refused to create it.</summary>
public sealed record PayoutSubmission(PayoutReport? Accepted, string? Refusal);
