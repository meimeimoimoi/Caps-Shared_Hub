using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Availability slots of one expert.</summary>
public interface ISlotRepository
{
    Task<bool> OverlapsAsync(
        Guid profileId,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        CancellationToken ct
    );
    Task<IReadOnlyList<SlotResponse>> ListUpcomingAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>The slot only when it belongs to this expert, so nobody can touch another expert's slots.</summary>
    Task<AvailabilitySlot?> FindAsync(Guid profileId, Guid slotId, CancellationToken ct);
    void Add(AvailabilitySlot slot);
    void Remove(AvailabilitySlot slot);
}
