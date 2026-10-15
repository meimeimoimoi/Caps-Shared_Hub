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
