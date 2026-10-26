using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Review cases, read by the use cases that act on one case.</summary>
public interface IReviewCaseRepository
{
    /// <summary>One case, untracked.</summary>
    Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>Tracks a new case.</summary>
    void Add(ReviewCase reviewCase);

    /// <summary>Tracks a status change; always added explicitly because its id is set by the client.</summary>
    void AddHistory(ReviewStatusHistory history);

    /// <summary>One case, tracked so its status change is saved.</summary>
    Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>Cases the user requested or reviews, newest first, untracked.</summary>
    Task<IReadOnlyList<ReviewCase>> ListForUserAsync(Guid userId, CancellationToken ct);
}
