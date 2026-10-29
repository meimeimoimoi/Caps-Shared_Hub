namespace Caps.Expert.Application.Abstractions;

/// <summary>Capacity slots held by review cases; both calls are safe to repeat.</summary>
public interface IExpertCaseSlots
{
    /// <summary>
    /// Takes a slot for the case; false when the expert is full. Must run in a transaction: the caller
    /// commits only on true, so a full expert leaves nothing behind.
    /// </summary>
    Task<bool> TakeAsync(
        Guid profileId,
        Guid reviewCaseId,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>Frees the case's slot; a case without one is ignored.</summary>
    Task ReleaseAsync(Guid profileId, Guid reviewCaseId, CancellationToken ct);
}
