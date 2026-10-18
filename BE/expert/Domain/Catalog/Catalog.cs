using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Catalog;

/// <summary>A time slot an expert can be booked for; managed by a later phase (no API yet).</summary>
public sealed class AvailabilitySlot
{
    private AvailabilitySlot() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; }
    public ExpertProfile ExpertProfile { get; } = default!;
    public DateTimeOffset StartAt { get; }
    public DateTimeOffset EndAt { get; }
    public string Status { get; } = "OPEN";
    public DateTimeOffset CreatedAt { get; }
}
