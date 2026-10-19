using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Catalog;

/// <summary>A service an approved expert sells at a price and delivery time the expert chooses.</summary>
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
    public ExpertProfile ExpertProfile { get; } = default!;
    public string ServiceType { get; private set; } = default!;
    public long Fee { get; private set; }

    /// <summary>Hours from starting the review to delivering it; sets the case deadline.</summary>
    public int TurnaroundHours { get; private set; }
    public bool IsActive { get; } = true;
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Starts selling a service; it must be one the administrator opened (has a platform fee).</summary>
    public static ServiceOffering Create(
        Guid expertProfileId,
        PlatformFee rate,
        long fee,
        int turnaroundHours,
        DateTimeOffset now
    )
    {
        Validate(fee, turnaroundHours);
        return new()
        {
            ExpertProfileId = expertProfileId,
            ServiceType = rate.ServiceType,
            Fee = fee,
            TurnaroundHours = turnaroundHours,
            CreatedAt = now,
        };
    }

    /// <summary>New price and delivery time; cases already booked keep the price they were booked at.</summary>
    public void Reprice(long fee, int turnaroundHours)
    {
        Validate(fee, turnaroundHours);
        Fee = fee;
        TurnaroundHours = turnaroundHours;
    }

    private static void Validate(long fee, int turnaroundHours)
    {
        if (fee is < MinFee or > MaxFee || fee % FeeStep != 0)
            throw ExpertErrors.FeeInvalid(MinFee, MaxFee, FeeStep);
        if (turnaroundHours is < 1 or > MaxTurnaroundHours)
            throw ExpertErrors.TurnaroundInvalid(MaxTurnaroundHours);
    }
}

/// <summary>A time slot an expert can be booked for; managed by a later phase (no API yet).</summary>
public sealed class AvailabilitySlot
{
    private AvailabilitySlot() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; }
    public ExpertProfile ExpertProfile { get; } = default!;
    public DateTimeOffset StartAt { get; }
    public DateTimeOffset EndAt { get; }
    public string Status { get; } = "OPEN";
    public DateTimeOffset CreatedAt { get; }
}

/// <summary>Gate 2 competency scoring by a reviewer; filled by a later phase (no API yet).</summary>
public sealed class ExpertCompetencyAssessment
{
    private ExpertCompetencyAssessment() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; }
    public ExpertProfile ExpertProfile { get; } = default!;

    /// <summary>Reviewer account id from the identity service.</summary>
    public Guid AssessorUserId { get; }
    public short C1Score { get; }
    public short C2Score { get; }
    public short C3Score { get; }
    public short C4Score { get; }
    public short C5Score { get; }
    public string Rationale { get; } = default!;
    public string Decision { get; } = default!;
    public DateTimeOffset CreatedAt { get; }
}
