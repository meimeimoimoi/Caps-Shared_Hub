using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Per-competency results of Gate 2 decisions.</summary>
public interface ICompetencyAssessmentRepository
{
    /// <summary>Results of the most recent decision with their cited files, in C order; empty before any decision.</summary>
    Task<IReadOnlyList<CompetencyAssessment>> ListLatestAsync(
        Guid qualificationId,
        CancellationToken ct
    );
    void AddRange(IEnumerable<CompetencyAssessment> assessments);
}
