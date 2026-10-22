using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>Application audit trail: each status change stores the actor, time and note.</summary>
public sealed class ExpertApplicationEvent
{
    private ExpertApplicationEvent() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ApplicationId { get; private set; }
    public ExpertApplication Application { get; } = default!;

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid ActorUserId { get; private set; }
    public string? FromStatus { get; private set; }
    public string ToStatus { get; private set; } = default!;
    public string? Note { get; private set; }

    /// <summary>What the applicant declared, set only on submissions (to SUBMITTED); never changed afterwards.</summary>
    public ProfileSnapshot? ProfileSnapshot { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The snapshot of the latest submission in the history, or null before the first one.</summary>
    public static ProfileSnapshot? LatestSnapshot(IEnumerable<ExpertApplicationEvent> history) =>
        history
            .Where(x => x.ProfileSnapshot != null)
            .OrderBy(x => x.CreatedAt)
            .LastOrDefault()
            ?.ProfileSnapshot;

    public static ExpertApplicationEvent Record(
        Guid applicationId,
        Guid actorUserId,
        string? fromStatus,
        string toStatus,
        string? note,
        DateTimeOffset now,
        ProfileSnapshot? snapshot = null
    ) =>
        new()
        {
            ApplicationId = applicationId,
            ActorUserId = actorUserId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Note = note,
            ProfileSnapshot = snapshot,
            CreatedAt = now,
        };
}
