using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the claim part of a review for the caller: holder, expiry and claim history.</summary>
public interface IReviewClaimDescriber
{
    /// <summary>The claim of one review as the caller sees it, with emails resolved.</summary>
    /// <param name="holderUserId">The active holder, already checked against the hold.</param>
    /// <param name="claimable">True while the review waits for a decision.</param>
    Task<ReviewClaimStateResponse> DescribeAsync(
        string gate,
        Guid reviewId,
        Guid? holderUserId,
        DateTimeOffset? claimedAt,
        DateTimeOffset? expiresAt,
        bool claimable,
        Guid applicantUserId,
        CancellationToken ct
    );
}
