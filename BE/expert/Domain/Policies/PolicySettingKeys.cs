using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Domain.Policies;

/// <summary>Allowed range of one adjustable policy value.</summary>
public sealed record PolicySettingRange(int Min, int Max);

/// <summary>
/// Names of the policy values a System Admin can change at runtime (BR-E29). The names match the
/// "ExpertPolicy" configuration keys that hold their default values.
/// </summary>
public static class PolicySettingKeys
{
    /// <summary>EV-06 minimum years of tax/accounting experience (BR-E11).</summary>
    public const string MinYearsExperience = "MinYearsExperience";

    /// <summary>Days to wait for a new application after Gate 1 NOT_ELIGIBLE (BR-E21).</summary>
    public const string ReapplyNotEligibleDays = "ReapplyNotEligibleDays";

    /// <summary>Days to wait before registering the same service again after Gate 2 FAIL (BR-E22).</summary>
    public const string ReapplyCompetencyFailDays = "ReapplyCompetencyFailDays";

    /// <summary>Hours a reviewer keeps a claimed review before it returns to the shared queue.</summary>
    public const string ReviewClaimHours = "ReviewClaimHours";

    /// <summary>Rounds of "more information needed" a Gate 1 or Gate 2 review may ask for (M4).</summary>
    public const string MaxInformationRequests = "MaxInformationRequests";

    /// <summary>Days a review may wait for a reviewer before the queue flags it (M5, warning only).</summary>
    public const string ReviewSlaDays = "ReviewSlaDays";

    /// <summary>Days the final approval may take after Gate 2 PASS before the queue flags it (D8, warning only).</summary>
    public const string FinalApprovalDays = "FinalApprovalDays";

    /// <summary>Lowest price an expert may set for a service, in VND.</summary>
    public const string PricingMinFee = "PricingMinFee";

    /// <summary>Highest price an expert may set for a service, in VND.</summary>
    public const string PricingMaxFee = "PricingMaxFee";

    /// <summary>Shortest turnaround an expert may promise, in days.</summary>
    public const string TurnaroundMinDays = "TurnaroundMinDays";

    /// <summary>Longest turnaround an expert may promise, in days.</summary>
    public const string TurnaroundMaxDays = "TurnaroundMaxDays";

    /// <summary>Days ahead a platform fee change must be announced before it takes effect.</summary>
    public const string PlatformFeeNoticeDays = "PlatformFeeNoticeDays";

    /// <summary>Price change, in percent of the old price, above which the expert sees a red warning.</summary>
    public const string PriceChangeWarningPercent = "PriceChangeWarningPercent";

    /// <summary>
    /// Every adjustable value with its allowed range, in display order. The reapply intervals start at the
    /// minimums of BR-E21/BR-E22, so an admin can only lengthen them: lowering them would waive the wait,
    /// which BR-E27 forbids. Going below needs a business rule change first.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, PolicySettingRange> Ranges = new Dictionary<
        string,
        PolicySettingRange
    >
    {
        [MinYearsExperience] = new(0, 50),
        [ReapplyNotEligibleDays] = new(30, 365),
        [ReapplyCompetencyFailDays] = new(90, 365),
        [ReviewClaimHours] = new(4, 336),
        [MaxInformationRequests] = new(1, 5),
        [ReviewSlaDays] = new(1, 30),
        [FinalApprovalDays] = new(1, 30),
        // The outer limits of the price and turnaround ranges are the technical bounds of ServiceOffering
        [PricingMinFee] = new(ServiceOffering.TechnicalMinFee, ServiceOffering.TechnicalMaxFee),
        [PricingMaxFee] = new(ServiceOffering.TechnicalMinFee, ServiceOffering.TechnicalMaxFee),
        [TurnaroundMinDays] = new(1, ServiceOffering.TechnicalMaxTurnaroundDays),
        [TurnaroundMaxDays] = new(1, ServiceOffering.TechnicalMaxTurnaroundDays),
        [PlatformFeeNoticeDays] = new(1, 30),
        [PriceChangeWarningPercent] = new(10, 200),
    };

    /// <summary>Minimum and maximum keys of the same range; the minimum may not exceed the maximum.</summary>
    private static readonly (string Min, string Max)[] OrderedPairs =
    [
        (PricingMinFee, PricingMaxFee),
        (TurnaroundMinDays, TurnaroundMaxDays),
    ];

    public static readonly string[] All =
    [
        MinYearsExperience,
        ReapplyNotEligibleDays,
        ReapplyCompetencyFailDays,
        ReviewClaimHours,
        MaxInformationRequests,
        ReviewSlaDays,
        FinalApprovalDays,
        PricingMinFee,
        PricingMaxFee,
        TurnaroundMinDays,
        TurnaroundMaxDays,
        PlatformFeeNoticeDays,
        PriceChangeWarningPercent,
    ];

    /// <summary>
    /// The value moved into its range. A value stored before the range was narrowed (for example 0 days) must
    /// never apply, so it reads as the nearest allowed value until an admin saves a new one.
    /// </summary>
    public static int Clamp(string key, int value) =>
        Math.Clamp(value, Ranges[key].Min, Ranges[key].Max);

    /// <summary>Throws unless the key is known and the value is within its range.</summary>
    public static void Validate(string key, int value)
    {
        if (!Ranges.TryGetValue(key, out var range))
            throw ExpertErrors.UnknownPolicySetting(key);
        if (value < range.Min || value > range.Max)
            throw ExpertErrors.PolicySettingOutOfRange(key, range.Min, range.Max);
    }

    /// <summary>Throws when the values in force after a change would put a range minimum above its maximum.</summary>
    public static void EnsureOrdered(IReadOnlyDictionary<string, int> values)
    {
        foreach (var (min, max) in OrderedPairs)
        {
            if (values[min] > values[max])
                throw ExpertErrors.PolicyRangeInverted(min, max);
        }
    }
}
