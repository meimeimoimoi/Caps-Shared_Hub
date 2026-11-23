using Caps.Common.Domain;

namespace Caps.Expert.Domain.Qualifications;

/// <summary>Qualification audit trail: each status change stores the actor, time and note (BR-E14).</summary>
public sealed class QualificationEvent
{
    private QualificationEvent() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid QualificationId { get; private set; }

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid ActorUserId { get; private set; }
    public string? FromStatus { get; private set; }
    public string ToStatus { get; private set; } = default!;
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static QualificationEvent Record(
        Guid qualificationId,
        Guid actorUserId,
        string? fromStatus,
        string toStatus,
        string? note,
        DateTimeOffset now
    ) =>
        new()
        {
            QualificationId = qualificationId,
            ActorUserId = actorUserId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Note = note,
            CreatedAt = now,
        };
}
