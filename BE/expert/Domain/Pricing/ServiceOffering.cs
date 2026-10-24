using Caps.Common.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// The price and delivery time an expert sells one service for, competing freely with other experts.
/// Cases freeze the price when booked, so a new price only applies to new cases. Every save is also kept as a
/// ServiceOfferingChange, so the price history stays even though this row holds only the current price.
/// </summary>
public sealed class ServiceOffering
{
    // Outer bounds the admin's price and turnaround ranges must stay within (also the database check)
    public const int TechnicalMinFee = 10_000;
    public const int TechnicalMaxFee = 1_000_000_000;
    public const int TechnicalMaxTurnaroundDays = 30;
    public const int TechnicalMaxTurnaroundHours =
        TechnicalMaxTurnaroundDays * PricingPolicy.HoursPerDay;

    private ServiceOffering() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public string ServiceCode { get; private set; } = default!;
    public long Fee { get; private set; }

    /// <summary>Hours from accepting the case to delivering it, in whole days; sets the case deadline.</summary>
    public int TurnaroundHours { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Starts selling a service the expert passed Gate 2 for and the admin set a fee for.</summary>
    public static (ServiceOffering Offering, ServiceOfferingChange Change) Create(
        ExpertServiceQualification? qualification,
        PlatformFee rate,
        long fee,
        int turnaroundHours,
        PricingPolicy policy,
        Guid actorUserId,
        DateTimeOffset now
    )
    {
        EnsureQualified(qualification);
        Validate(fee, turnaroundHours, policy);
        var offering = new ServiceOffering
        {
            ExpertProfileId = qualification!.ExpertProfileId,
            ServiceCode = rate.ServiceCode,
            Fee = fee,
            TurnaroundHours = turnaroundHours,
            CreatedAt = now,
            UpdatedAt = now,
        };
        return (offering, ServiceOfferingChange.Record(offering, null, null, actorUserId, now));
    }

    /// <summary>
    /// New price and delivery time; only while the expert is still approved for the service. Returns the change
    /// to keep, or null when nothing changed.
    /// </summary>
    public ServiceOfferingChange? Reprice(
        ExpertServiceQualification? qualification,
        long fee,
        int turnaroundHours,
        PricingPolicy policy,
        Guid actorUserId,
        DateTimeOffset now
    )
    {
        EnsureQualified(qualification);
        Validate(fee, turnaroundHours, policy);
        if (fee == Fee && turnaroundHours == TurnaroundHours)
            return null;
        var (oldFee, oldHours) = (Fee, TurnaroundHours);
        Fee = fee;
        TurnaroundHours = turnaroundHours;
        UpdatedAt = now;
        return ServiceOfferingChange.Record(this, oldFee, oldHours, actorUserId, now);
    }

    // Gate 2: only experts approved for this very service may sell it
    private static void EnsureQualified(ExpertServiceQualification? qualification)
    {
        if (qualification?.Status != QualificationStatus.ApprovedForService)
            throw ExpertErrors.PricingNotAllowed(qualification?.Status ?? "NOT_REGISTERED");
    }

    private static void Validate(long fee, int turnaroundHours, PricingPolicy policy)
    {
        if (fee < policy.MinFee || fee > policy.MaxFee || fee % PricingPolicy.FeeStep != 0)
            throw ExpertErrors.FeeInvalid(policy.MinFee, policy.MaxFee, PricingPolicy.FeeStep);
        var days = turnaroundHours / PricingPolicy.HoursPerDay;
        if (
            turnaroundHours % PricingPolicy.HoursPerDay != 0
            || days < policy.MinTurnaroundDays
            || days > policy.MaxTurnaroundDays
        )
        {
            throw ExpertErrors.TurnaroundInvalid(
                policy.MinTurnaroundDays,
                policy.MaxTurnaroundDays
            );
        }
    }
}
