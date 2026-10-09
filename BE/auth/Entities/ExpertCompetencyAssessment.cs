using Caps.Common.Database;

namespace auth.Entities;

public sealed class ExpertCompetencyAssessment
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    public Guid AssessorUserId { get; set; }
    public User Assessor { get; set; } = default!;

    public short C1Score { get; set; }
    public short C2Score { get; set; }
    public short C3Score { get; set; }
    public short C4Score { get; set; }
    public short C5Score { get; set; }
    public string Rationale { get; set; } = default!;
    public string Decision { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
