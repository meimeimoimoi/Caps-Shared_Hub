using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Client disputes about deliveries; a case has at most one.</summary>
public interface IReviewDisputeRepository
{
    /// <summary>The case's dispute, tracked so a statement or a decision is saved.</summary>
    Task<ReviewDispute?> FindByCaseAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>Tracks a new dispute.</summary>
    void Add(ReviewDispute dispute);

    /// <summary>Open disputes with their cases, earliest decision deadline first, untracked.</summary>
    Task<IReadOnlyList<(ReviewDispute Dispute, ReviewCase Case)>> ListOpenAsync(
        CancellationToken ct
    );
}
