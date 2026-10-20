using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Catalog;

/// <summary>
/// A time window in which the expert can take new work, shared by all their services (BR-M01). Booking
/// (Slot Lock, BR-M03) is owned by the case workflow and is not built yet, so slots are only OPEN here.
/// </summary>
public sealed class AvailabilitySlot
{
    public const string Open = "OPEN";

    private AvailabilitySlot() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; } = default!;
    public DateTimeOffset StartAt { get; private set; }
    public DateTimeOffset EndAt { get; private set; }
    public string Status { get; } = Open;
    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsOpen => Status == Open;

    /// <summary>Opens a new slot after checking it against the rules and the expert's other open slots.</summary>
    /// <param name="openSlots">The expert's open slots that have not ended yet.</param>
    public static AvailabilitySlot Add(
        Guid profileId,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        IReadOnlyCollection<AvailabilitySlot> openSlots,
        DateTimeOffset now
    )
    {
        AvailabilityRules.Validate(startAt, endAt, openSlots, now);
        // Stored in UTC: clients send local offsets (e.g. +07:00) and timestamptz only accepts UTC
        return new AvailabilitySlot
        {
            ExpertProfileId = profileId,
            StartAt = startAt.ToUniversalTime(),
            EndAt = endAt.ToUniversalTime(),
            CreatedAt = now,
        };
    }

    /// <summary>Only open slots can be removed; a booked slot belongs to its case.</summary>
    public void EnsureRemovable()
    {
        if (!IsOpen)
            throw ExpertErrors.SlotLocked();
    }
}

/// <summary>Availability rules: future slots of 1–12 hours, no overlaps, at most 50 open at a time.</summary>
public static class AvailabilityRules
{
    public static readonly TimeSpan MinDuration = TimeSpan.FromHours(1);
    public static readonly TimeSpan MaxDuration = TimeSpan.FromHours(12);
    public const int MaxOpenSlots = 50;

    /// <summary>How far ahead slots can be opened.</summary>
    public static readonly TimeSpan MaxAhead = TimeSpan.FromDays(90);

    public static void Validate(
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        IReadOnlyCollection<AvailabilitySlot> openSlots,
        DateTimeOffset now
    )
    {
        if (startAt <= now)
            throw ExpertErrors.SlotInPast();
        if (startAt > now + MaxAhead)
            throw ExpertErrors.SlotTooFarAhead((int)MaxAhead.TotalDays);
        var length = endAt - startAt;
        if (length < MinDuration || length > MaxDuration)
        {
            throw ExpertErrors.SlotLengthInvalid(
                (int)MinDuration.TotalHours,
                (int)MaxDuration.TotalHours
            );
        }
        if (openSlots.Count >= MaxOpenSlots)
            throw ExpertErrors.SlotLimit(MaxOpenSlots);
        if (openSlots.Any(x => x.StartAt < endAt && startAt < x.EndAt))
            throw ExpertErrors.SlotOverlap();
    }
}
