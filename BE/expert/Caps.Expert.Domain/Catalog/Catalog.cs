using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Catalog;

/// <summary>A service an approved expert sells; managed by a later phase (no API yet).</summary>
public sealed class ServiceOffering
{
    private ServiceOffering() { }

    public Guid Id { get; private set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; private set; } = default!;
    public string ServiceType { get; private set; } = default!;
    public long Fee { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTimeOffset CreatedAt { get; private set; }
}

/// <summary>A time slot an expert can be booked for; managed by a later phase (no API yet).</summary>
public sealed class AvailabilitySlot
{
    private AvailabilitySlot() { }

    public Guid Id { get; private set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; private set; } = default!;
    public DateTimeOffset StartAt { get; private set; }
    public DateTimeOffset EndAt { get; private set; }
    public string Status { get; private set; } = "OPEN";
    public DateTimeOffset CreatedAt { get; private set; }
}

/// <summary>Gate 2 competency scoring by a reviewer; filled by a later phase (no API yet).</summary>
public sealed class ExpertCompetencyAssessment
{
    private ExpertCompetencyAssessment() { }

    public Guid Id { get; private set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; private set; } = default!;

    /// <summary>Reviewer account id from the identity service.</summary>
    public Guid AssessorUserId { get; private set; }
    public short C1Score { get; private set; }
    public short C2Score { get; private set; }
    public short C3Score { get; private set; }
    public short C4Score { get; private set; }
    public short C5Score { get; private set; }
    public string Rationale { get; private set; } = default!;
    public string Decision { get; private set; } = default!;
    public DateTimeOffset CreatedAt { get; private set; }
}
