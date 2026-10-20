using Caps.Common.Domain;

namespace Caps.Expert.Domain.Qualifications;

/// <summary>
/// One competency's result in a Gate 2 decision with the files it relies on (BR-E09, BR-E36). Rows are
/// linked to the decision's event, so every past decision keeps its own results.
/// </summary>
public sealed class CompetencyAssessment
{
    private CompetencyAssessment() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid QualificationId { get; private set; }

    /// <summary>The status change that recorded this decision.</summary>
    public Guid EventId { get; private set; }
    public string Competency { get; private set; } = default!;
    public string Result { get; private set; } = default!;
    public string Note { get; private set; } = default!;

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid ReviewerUserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public ICollection<CompetencyAssessmentEvidence> Evidence { get; } = [];

    public static CompetencyAssessment Record(
        QualificationEvent decision,
        CompetencyResult result,
        Guid reviewerUserId
    )
    {
        var assessment = new CompetencyAssessment
        {
            QualificationId = decision.QualificationId,
            EventId = decision.Id,
            Competency = result.Code,
            Result = result.Result,
            Note = result.Note ?? "",
            ReviewerUserId = reviewerUserId,
            CreatedAt = decision.CreatedAt,
        };
        foreach (var evidenceId in result.EvidenceIds)
            assessment.Evidence.Add(new(assessment.Id, evidenceId));
        return assessment;
    }
}

/// <summary>A file cited by one competency result; one file may support several competencies.</summary>
public sealed class CompetencyAssessmentEvidence(Guid assessmentId, Guid evidenceId)
{
    public Guid AssessmentId { get; } = assessmentId;
    public Guid EvidenceId { get; } = evidenceId;
}
