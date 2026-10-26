using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Questions the expert asks the client during a review.</summary>
public interface IInfoRequestRepository
{
    /// <summary>The case's unanswered question, tracked so the answer is saved.</summary>
    Task<InfoRequest?> FindOpenForUpdateAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>Tracks a new question.</summary>
    void Add(InfoRequest request);
}
