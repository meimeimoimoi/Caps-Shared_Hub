using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Files tied to competencies and the expert's description of each competency (E3, E4).</summary>
public interface ICompetencyEvidenceRepository
{
    /// <summary>Every file–competency link of the qualification, untracked.</summary>
    Task<IReadOnlyList<CompetencyEvidenceLink>> ListLinksAsync(
        Guid qualificationId,
        CancellationToken ct
    );

    /// <summary>The competencies one file supports, tracked so they can be replaced.</summary>
    Task<IReadOnlyList<CompetencyEvidenceLink>> ListLinksForEvidenceAsync(
        Guid evidenceId,
        CancellationToken ct
    );

    /// <summary>Every description of the qualification, untracked.</summary>
    Task<IReadOnlyList<CompetencyDescription>> ListDescriptionsAsync(
        Guid qualificationId,
        CancellationToken ct
    );

    /// <summary>The description of one competency, tracked for changes.</summary>
    Task<CompetencyDescription?> FindDescriptionAsync(
        Guid qualificationId,
        string competency,
        CancellationToken ct
    );

    void AddLinks(IEnumerable<CompetencyEvidenceLink> links);
    void RemoveLinks(IEnumerable<CompetencyEvidenceLink> links);
    void AddDescription(CompetencyDescription description);
    void RemoveDescription(CompetencyDescription description);
}
