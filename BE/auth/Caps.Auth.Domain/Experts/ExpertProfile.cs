using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Experts;

public sealed class ExpertProfile
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public int? YearsExperience { get; set; }
    public string? Bio { get; set; }
    public string? Title { get; set; }
    public string? Company { get; set; }
    public string? Location { get; set; }
    public DateOnly? BirthDate { get; set; }

    /// <summary>Expertise fields chosen by the applicant (fixed codes, see ExpertApplicationRules).</summary>
    public string[] Fields { get; set; } = [];
    public string? Highlights { get; set; }
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
    public ICollection<ExpertApplication> Applications { get; set; } =
        new List<ExpertApplication>();
    public ICollection<ExpertCompetencyAssessment> Assessments { get; set; } =
        new List<ExpertCompetencyAssessment>();
    public ICollection<ServiceOffering> ServiceOfferings { get; set; } =
        new List<ServiceOffering>();
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } =
        new List<AvailabilitySlot>();
}
