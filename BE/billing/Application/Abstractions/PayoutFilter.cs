namespace Caps.Billing.Application.Abstractions;

/// <summary>Staff filters on the payout table; a null field does not filter.</summary>
public sealed record PayoutFilter(
    string? Status,
    Guid? RecipientUserId = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    long? MinAmount = null,
    long? MaxAmount = null
);
