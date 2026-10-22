using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Review cases, read by the use cases that act on one case.</summary>
public interface IReviewCaseRepository
{
    /// <summary>One case, untracked.</summary>
    Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct);
}
