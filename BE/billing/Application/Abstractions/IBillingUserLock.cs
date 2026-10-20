namespace Caps.Billing.Application.Abstractions;

/// <summary>
/// Serializes billing changes of one user inside the current transaction, including the first change
/// when the user has no row yet to lock.
/// </summary>
public interface IBillingUserLock
{
    Task AcquireAsync(Guid userId, CancellationToken ct);
}
