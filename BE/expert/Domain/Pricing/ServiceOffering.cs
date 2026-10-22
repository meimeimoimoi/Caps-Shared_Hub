using Caps.Common.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// The price and delivery time an expert sells one service for, competing freely with other experts.
/// Cases freeze the price when booked, so a new price only applies to new cases.
/// </summary>
public sealed class ServiceOffering
{
    // ponytail: price limits guard against typos only; tune them when the business sets real bounds
    public const long MinFee = 10_000;
    public const long MaxFee = 1_000_000_000;
    public const long FeeStep = 1_000;
    public const int MaxTurnaroundHours = 720;

    private ServiceOffering() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public string ServiceCode { get; private set; } = default!;
    public long Fee { get; private set; }

    /// <summary>Hours from accepting the case to delivering it; sets the case deadline.</summary>
    public int TurnaroundHours { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Starts selling a service the expert passed Gate 2 for and the admin set a fee for.</summary>
    public static ServiceOffering Create(
        ExpertServiceQualification? qualification,
        PlatformFee rate,
        long fee,
        int turnaroundHours,
        DateTimeOffset now
    )
    {
        EnsureQualified(qualification);
        Validate(fee, turnaroundHours);
        return new()
        {
            ExpertProfileId = qualification!.ExpertProfileId,
            ServiceCode = rate.ServiceCode,
            Fee = fee,
            TurnaroundHours = turnaroundHours,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    /// <summary>New price and delivery time; only while the expert is still approved for the service.</summary>
    public void Reprice(
        ExpertServiceQualification? qualification,
        long fee,
        int turnaroundHours,
        DateTimeOffset now
    )
    {
        EnsureQualified(qualification);
        Validate(fee, turnaroundHours);
        Fee = fee;
        TurnaroundHours = turnaroundHours;
        UpdatedAt = now;
    }

    // Gate 2: only experts approved for this very service may sell it
    private static void EnsureQualified(ExpertServiceQualification? qualification)
    {
        if (qualification?.Status != QualificationStatus.ApprovedForService)
            throw ExpertErrors.PricingNotAllowed(qualification?.Status ?? "NOT_REGISTERED");
    }

    private static void Validate(long fee, int turnaroundHours)
    {
        if (fee is < MinFee or > MaxFee || fee % FeeStep != 0)
            throw ExpertErrors.FeeInvalid(MinFee, MaxFee, FeeStep);
        if (turnaroundHours is < 1 or > MaxTurnaroundHours)
            throw ExpertErrors.TurnaroundInvalid(MaxTurnaroundHours);
    }
}
