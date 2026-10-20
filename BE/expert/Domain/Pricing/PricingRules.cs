namespace Caps.Expert.Domain.Pricing;

/// <summary>Pricing Version statuses (state model 5).</summary>
public static class PricingStatus
{
    public const string Draft = "DRAFT";
    public const string PendingApproval = "PENDING_APPROVAL";
    public const string ReturnForRevision = "RETURN_FOR_REVISION";
    public const string Approved = "APPROVED";
    public const string Rejected = "REJECTED";

    /// <summary>Replaced by a newer approved version; still the price in effect until its EffectiveTo.</summary>
    public const string Superseded = "SUPERSEDED";

    /// <summary>The expert can still edit and submit it.</summary>
    public static bool IsEditable(string status) => status is Draft or ReturnForRevision;

    /// <summary>Not decided yet: at most one such version per service.</summary>
    public static bool IsOpen(string status) => IsEditable(status) || status == PendingApproval;
}

/// <summary>What a System Admin can decide on a pricing change above the auto-approval threshold.</summary>
public static class PricingDecision
{
    public const string Approve = "APPROVE";
    public const string ReturnForRevision = "RETURN_FOR_REVISION";
    public const string Reject = "REJECT";
}

/// <summary>Audit actions of a pricing version (BR-E20).</summary>
public static class PricingAction
{
    public const string Saved = "SAVED";
    public const string Submitted = "SUBMITTED";

    /// <summary>Approved by the system: first price, or a change within the threshold (BR-E17).</summary>
    public const string AutoApproved = "AUTO_APPROVED";
    public const string Approved = "APPROVED";
    public const string Returned = "RETURNED_FOR_REVISION";
    public const string Rejected = "REJECTED";
    public const string Superseded = "SUPERSEDED";
}

/// <summary>
/// Service Pricing Policy values (POL-MKT-02), kept in configuration (BR-E29): the price range and the
/// largest change from the current price that is approved without a System Admin.
/// </summary>
public sealed record PricingPolicy(long MinPrice, long MaxPrice, int AutoApproveMaxChangePercent);

/// <summary>Validation and auto-approval rules of service prices (POL-MKT-02, BR-E17).</summary>
public static class PricingRules
{
    public const int MaxReasonLength = 1000;

    // Vietnam has no daylight saving time; effective dates are business dates in UTC+7
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Today's business date in Vietnam.</summary>
    public static DateOnly BusinessDate(DateTimeOffset now) =>
        DateOnly.FromDateTime(now.ToOffset(VietnamOffset).DateTime);

    /// <summary>Checks the amount range, an effective date not in the past and the reason (required to submit).</summary>
    public static void Validate(
        long amount,
        DateOnly effectiveFrom,
        string? reason,
        bool submitting,
        PricingPolicy policy,
        DateOnly today
    )
    {
        if (amount < policy.MinPrice || amount > policy.MaxPrice)
            throw ExpertErrors.PriceOutOfRange(policy.MinPrice, policy.MaxPrice);
        if (effectiveFrom < today)
            throw ExpertErrors.EffectiveDateInPast();
        if (reason?.Length > MaxReasonLength)
            throw ExpertErrors.PricingReasonTooLong(MaxReasonLength);
        if (submitting && string.IsNullOrWhiteSpace(reason))
            throw ExpertErrors.PricingReasonRequired();
    }

    /// <summary>Change from the current price in whole percent, rounded up; null for the first price.</summary>
    public static int? ChangePercent(long amount, long? currentAmount) =>
        currentAmount is > 0
            ? (int)Math.Ceiling(Math.Abs(amount - currentAmount.Value) * 100m / currentAmount.Value)
            : null;

    /// <summary>The first price, or a change within the threshold, needs no System Admin (BR-E17).</summary>
    public static bool AutoApproves(int? changePercent, PricingPolicy policy) =>
        changePercent == null || changePercent <= policy.AutoApproveMaxChangePercent;
}
