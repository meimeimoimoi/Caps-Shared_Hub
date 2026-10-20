using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Experts' availability slots.</summary>
public interface IAvailabilityRepository
{
    /// <summary>Open slots of the profile that have not ended yet, earliest first, untracked.</summary>
    Task<IReadOnlyList<AvailabilitySlot>> ListOpenAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>Open future slots of several profiles (Marketplace), untracked.</summary>
    Task<IReadOnlyList<AvailabilitySlot>> ListOpenAsync(
        IReadOnlyCollection<Guid> profileIds,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>One of the profile's slots, tracked.</summary>
    Task<AvailabilitySlot?> FindAsync(Guid slotId, Guid profileId, CancellationToken ct);

    void Add(AvailabilitySlot slot);
    void Remove(AvailabilitySlot slot);
}
