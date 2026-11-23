using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One rate a System Admin set for a service: the terms, when it applies, who set it and why.</summary>
public sealed record PlatformFeeChangeResponse(
    int Percent,
    int LatePenaltyHours,
    int LatePenaltyPercent,
    int LateCancelHours,
    int NoResponseDays,
    int NoResponseRefundPercent,
    int NoResponseExpertPercent,
    int NoDeliveryRefundPercent,
    DateTimeOffset EffectiveFrom,
    string SetBy,
    string? Reason,
    DateTimeOffset? CancelledAt
)
{
    public static PlatformFeeChangeResponse From(PlatformFee f) =>
        new(
            f.Percent,
            f.LatePenaltyHours,
            f.LatePenaltyPercent,
            f.LateCancelHours,
            f.NoResponseDays,
            f.NoResponseRefundPercent,
            f.NoResponseExpertPercent,
            f.NoDeliveryRefundPercent,
            f.EffectiveFrom,
            f.SetBy.ToString(),
            f.Reason,
            f.CancelledAt
        );
}
