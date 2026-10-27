namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// The pricing limits a System Admin sets (policy settings): the price range, the turnaround range in days,
/// how far ahead a platform fee change must be announced and when a price change is flagged to the expert.
/// </summary>
/// <param name="MinFee">Lowest price an expert may set, in VND.</param>
/// <param name="MaxFee">Highest price an expert may set, in VND.</param>
/// <param name="MinTurnaroundDays">Shortest turnaround an expert may promise.</param>
/// <param name="MaxTurnaroundDays">Longest turnaround an expert may promise.</param>
/// <param name="FeeNoticeDays">Days ahead a platform fee change must be announced.</param>
/// <param name="ChangeWarningPercent">Price change above which the confirmation shows a red warning.</param>
public sealed record PricingPolicy(
    long MinFee,
    long MaxFee,
    int MinTurnaroundDays,
    int MaxTurnaroundDays,
    int FeeNoticeDays,
    int ChangeWarningPercent
)
{
    /// <summary>Prices are whole steps of 10,000 VND so they stay round and easy to compare.</summary>
    public const long FeeStep = 10_000;

    public const int HoursPerDay = 24;
}
