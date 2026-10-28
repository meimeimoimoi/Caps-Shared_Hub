using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the platform fee row an admin sees, shared by the list and the change handlers.</summary>
public static class PlatformFeeRows
{
    public static PlatformFeeResponse Build(
        ServiceCatalogItem service,
        PlatformFee? current,
        PlatformFee? pending,
        PricingPolicy policy,
        DateTimeOffset now
    ) =>
        new(
            service.Code,
            service.Name,
            current?.Percent,
            current == null ? null : LateOf(current),
            current?.EffectiveFrom,
            pending == null ? null : new(pending.Percent, LateOf(pending), pending.EffectiveFrom),
            PlatformFee.EarliestEffectiveOn(now, policy.FeeNoticeDays),
            policy.FeeNoticeDays,
            PlatformFee.MaxPercent
        );

    public static PricingLimitsResponse Limits(PricingPolicy policy) =>
        new(
            policy.MinFee,
            policy.MaxFee,
            PricingPolicy.FeeStep,
            policy.MinTurnaroundDays,
            policy.MaxTurnaroundDays,
            policy.ChangeWarningPercent
        );

    public static LateRuleResponse LateOf(PlatformFee fee) =>
        new(fee.LatePenaltyHours, fee.LatePenaltyPercent, fee.LateCancelHours);
}
