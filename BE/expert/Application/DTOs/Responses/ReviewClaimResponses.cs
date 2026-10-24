namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>Who works on a review now.</summary>
/// <param name="HolderEmail">Email of the holder as last seen by this service; null when unknown.</param>
/// <param name="ExpiresAt">When the review returns to the queue; null while waiting for the expert.</param>
/// <param name="HeldByMe">True when the caller holds it and may decide.</param>
public sealed record ReviewClaimResponse(
    string HolderUserId,
    string? HolderEmail,
    DateTimeOffset ClaimedAt,
    DateTimeOffset? ExpiresAt,
    bool HeldByMe
);

/// <summary>One change of a review's claim.</summary>
/// <param name="Action">CLAIM (with a previous holder: their claim had expired), RELEASE or REASSIGN.</param>
public sealed record ReviewClaimEventResponse(
    string Action,
    string ActorUserId,
    string? ActorEmail,
    string? HolderUserId,
    string? HolderEmail,
    string? PreviousHolderUserId,
    string? PreviousHolderEmail,
    string? Reason,
    DateTimeOffset At
);

/// <summary>The claim of a review with its history.</summary>
/// <param name="Current">Null when nobody holds the review (never claimed, released, decided or expired).</param>
/// <param name="CanClaim">True while the review waits for a decision and the caller may take it.</param>
public sealed record ReviewClaimStateResponse(
    ReviewClaimResponse? Current,
    bool CanClaim,
    ReviewClaimEventResponse[] History
);

/// <summary>A reviewer a System Admin can hand a review to.</summary>
public sealed record KnownReviewerResponse(string UserId, string? Email, DateTimeOffset LastSeenAt);
