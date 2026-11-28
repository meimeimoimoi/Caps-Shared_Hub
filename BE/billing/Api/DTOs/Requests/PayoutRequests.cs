using System.ComponentModel.DataAnnotations;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Why staff hold a payout and within how many days they review it (1–30, 7 by default).</summary>
public sealed record HoldPayoutRequest(
    [Required, MaxLength(1000)] string? Reason,
    int ReviewDays = 7
);

/// <summary>An optional note on lifting a hold, kept in the payout history.</summary>
public sealed record ReleasePayoutRequest([MaxLength(1000)] string? Note);

/// <summary>A manual transfer staff made: the bank transaction id, the amount typed again and when it left.</summary>
public sealed record ConfirmManualPayoutRequest(
    [Required, MinLength(4), MaxLength(100)] string BankRef,
    [Range(1, long.MaxValue)] long Amount,
    DateTimeOffset TransferredAt
);

/// <summary>Why a manual transfer failed, as the bank reported it.</summary>
public sealed record FailManualPayoutRequest(
    [Required, MinLength(5), MaxLength(1000)] string Reason
);
