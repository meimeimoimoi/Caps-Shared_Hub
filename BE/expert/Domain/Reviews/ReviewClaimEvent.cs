using Caps.Common.Domain;

namespace Caps.Expert.Domain.Reviews;

/// <summary>Claim history of a Gate 1 application or Gate 2 qualification: who took, gave back or handed it on.</summary>
public sealed class ReviewClaimEvent
{
    private ReviewClaimEvent() { }

    public Guid Id { get; } = UuidV7.NewGuid();

    /// <summary>GATE_1 for an application, GATE_2 for a qualification.</summary>
    public string Gate { get; private set; } = default!;

    /// <summary>The application or qualification id.</summary>
    public Guid ReviewId { get; private set; }
    public string Action { get; private set; } = default!;

    /// <summary>Account ids from the identity service (no foreign key across services).</summary>
    public Guid ActorUserId { get; private set; }

    /// <summary>Who holds the review after this change; null after a release.</summary>
    public Guid? HolderUserId { get; private set; }

    /// <summary>Who held it before: the expired holder on a claim, the old holder on a reassignment.</summary>
    public Guid? PreviousHolderUserId { get; private set; }
    public string? Reason { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static ReviewClaimEvent Record(
        string gate,
        Guid reviewId,
        string action,
        Guid actorUserId,
        Guid? holderUserId,
        Guid? previousHolderUserId,
        string? reason,
        DateTimeOffset now
    ) =>
        new()
        {
            Gate = gate,
            ReviewId = reviewId,
            Action = action,
            ActorUserId = actorUserId,
            HolderUserId = holderUserId,
            PreviousHolderUserId = previousHolderUserId,
            Reason = reason,
            CreatedAt = now,
        };
}
