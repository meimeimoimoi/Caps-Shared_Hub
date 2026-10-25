using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Common;

/// <summary>Resolves the emails of everyone in the claim and its history from the known reviewers.</summary>
public sealed class ReviewClaimDescriber(
    IReviewClaimEventRepository claimEvents,
    IKnownReviewerRepository reviewers,
    ICurrentUser currentUser
) : IReviewClaimDescriber
{
    public async Task<ReviewClaimStateResponse> DescribeAsync(
        string gate,
        Guid reviewId,
        Guid? holderUserId,
        DateTimeOffset? claimedAt,
        DateTimeOffset? expiresAt,
        bool claimable,
        Guid applicantUserId,
        CancellationToken ct
    )
    {
        var history = await claimEvents.ListAsync(gate, reviewId, ct);
        var ids = history
            .SelectMany(x => new[] { x.ActorUserId, x.HolderUserId, x.PreviousHolderUserId })
            .Append(holderUserId)
            .OfType<Guid>()
            .Distinct()
            .ToArray();
        var emails = await reviewers.FindEmailsAsync(ids, ct);
        string? Email(Guid? id) => id is Guid key ? emails.GetValueOrDefault(key) : null;
        Guid? viewer = Guid.TryParse(currentUser.UserId, out var parsed) ? parsed : null;

        var current =
            holderUserId != null && claimedAt != null
                ? new ReviewClaimResponse(
                    holderUserId.Value.ToString(),
                    Email(holderUserId),
                    claimedAt.Value,
                    expiresAt,
                    holderUserId == viewer
                )
                : null;
        return new(
            current,
            claimable && viewer != applicantUserId && current?.HeldByMe != false,
            history
                .Select(x => new ReviewClaimEventResponse(
                    x.Action,
                    x.ActorUserId.ToString(),
                    Email(x.ActorUserId),
                    x.HolderUserId?.ToString(),
                    Email(x.HolderUserId),
                    x.PreviousHolderUserId?.ToString(),
                    Email(x.PreviousHolderUserId),
                    x.Reason,
                    x.CreatedAt
                ))
                .ToArray()
        );
    }
}
