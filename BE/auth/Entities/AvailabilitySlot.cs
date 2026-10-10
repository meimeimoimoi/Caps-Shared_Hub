using Caps.Common.Database;

namespace auth.Entities;

public sealed class AvailabilitySlot
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
