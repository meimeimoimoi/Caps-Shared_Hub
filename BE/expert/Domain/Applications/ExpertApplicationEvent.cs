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
    public DateTimeOffset CreatedAt { get; private set; }

    public static ExpertApplicationEvent Record(
        Guid applicationId,
        Guid actorUserId,
        string? fromStatus,
        string toStatus,
        string? note,
        DateTimeOffset now
    ) =>
        new()
        {
            ApplicationId = applicationId,
            ActorUserId = actorUserId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Note = note,
            CreatedAt = now,
        };
}
