using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Claim history of the reviews (who took, gave back or handed on each one).</summary>
public interface IReviewClaimEventRepository
{
    /// <summary>The history of one application (GATE_1) or qualification (GATE_2), oldest first.</summary>
    Task<IReadOnlyList<ReviewClaimEvent>> ListAsync(
        string gate,
        Guid reviewId,
        CancellationToken ct
    );

    void Add(ReviewClaimEvent claimEvent);
}
