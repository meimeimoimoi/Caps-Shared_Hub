using Caps.Common.Domain;

namespace Caps.Expert.Domain.Pricing;

/// <summary>Pricing audit trail (BR-E20): who did what to a version, when, with which note.</summary>
public sealed class PricingEvent
{
    private PricingEvent() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid PricingVersionId { get; private set; }

    /// <summary>Denormalized so a service's whole history is read in one query.</summary>
    public Guid QualificationId { get; private set; }
    public string Action { get; private set; } = default!;

    /// <summary>Account id from the identity service; null when the system acted (auto-approval).</summary>
    public Guid? ActorUserId { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static PricingEvent Record(
        ServicePricingVersion version,
        string action,
        Guid? actorUserId,
        string? note,
        DateTimeOffset now
    ) =>
        new()
        {
            PricingVersionId = version.Id,
            QualificationId = version.QualificationId,
            Action = action,
            ActorUserId = actorUserId,
            Note = note,
            CreatedAt = now,
        };
}
