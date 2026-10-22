using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>How far each party has read the messages of a case.</summary>
public interface ICaseReadMarkerRepository
{
    /// <summary>The user's marker in the case, tracked.</summary>
    Task<CaseReadMarker?> FindAsync(Guid reviewCaseId, Guid userId, CancellationToken ct);

    void Add(CaseReadMarker marker);
}
