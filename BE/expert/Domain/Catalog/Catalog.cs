using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Catalog;

/// <summary>A service an approved expert sells; managed by a later phase (no API yet).</summary>
public sealed class ServiceOffering
{
    private ServiceOffering() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; }
    public ExpertProfile ExpertProfile { get; } = default!;
    public string ServiceType { get; } = default!;
    public long Fee { get; }
    public bool IsActive { get; } = true;
    public DateTimeOffset CreatedAt { get; }
}

/// <summary>A time slot an expert can be booked for; managed by a later phase (no API yet).</summary>
public sealed class AvailabilitySlot
{
    public const string OpenStatus = "OPEN";

    private AvailabilitySlot() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; } = default!;
    public DateTimeOffset StartAt { get; private set; }
    public DateTimeOffset EndAt { get; private set; }
    public string Status { get; } = OpenStatus;
    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsOpen => Status == OpenStatus;

    //<summary>Opens a future slot ; oberlap with other slots is checked by the caller under a lock. </summary>
    public static AvailabilitySlot Open(
        Guid expertProfileId,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        DateTimeOffset now
    )
    {
        if (startAt <= now || endAt <= now)
        {
            throw ExpertErrors.SlotInvalidTime();
        }
        return new()
        {
            ExpertProfileId = expertProfileId,
            StartAt = startAt,
            EndAt = endAt,
            CreatedAt = now,
        };
    }
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
