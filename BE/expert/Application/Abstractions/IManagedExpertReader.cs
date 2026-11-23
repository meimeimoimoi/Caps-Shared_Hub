namespace Caps.Expert.Application.Abstractions;

/// <summary>Read side of the admin expert list: Expert–Services past final approval, with their status history.</summary>
public interface IManagedExpertReader
{
    /// <summary>Every qualification in APPROVED_FOR_SERVICE or SUSPENDED, newest approval first.</summary>
    Task<IReadOnlyList<ManagedExpertRow>> ListAsync(CancellationToken ct);
}
