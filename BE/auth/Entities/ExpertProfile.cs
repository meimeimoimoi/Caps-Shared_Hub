using Caps.Common.Database;

namespace auth.Entities;

public sealed class ExpertProfile
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public int? YearsExperience { get; set; }
    public string? Bio { get; set; }
    public string Status { get; set; } = "SCREENING";
    public string ServiceStatus { get; set; } = "INACTIVE";
    public string? EligibilityNote { get; set; }
    public int? TurnaroundHours { get; set; }
    public decimal RatingAvg { get; set; }
    public int RatingCount { get; set; }
    public Guid? ApprovedBy { get; set; }
    public User? Approver { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ExpertEvidence> Evidences { get; set; } = new List<ExpertEvidence>();
    public ICollection<ExpertCompetencyAssessment> Assessments { get; set; } = new List<ExpertCompetencyAssessment>();
    public ICollection<ServiceOffering> ServiceOfferings { get; set; } = new List<ServiceOffering>();
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = new List<AvailabilitySlot>();
}
