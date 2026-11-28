using System.ComponentModel.DataAnnotations;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Why staff hold a payout and within how many days they review it (1–30, 7 by default).</summary>
public sealed record HoldPayoutRequest(
    [Required, MaxLength(1000)] string? Reason,
    int ReviewDays = 7
);

/// <summary>An optional note on lifting a hold, kept in the payout history.</summary>
public sealed record ReleasePayoutRequest([MaxLength(1000)] string? Note);
