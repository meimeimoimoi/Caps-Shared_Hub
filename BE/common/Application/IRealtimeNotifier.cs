namespace Caps.Common.Application;

/// <summary>
/// Tells connected clients that data changed so they refetch. Call it after the transaction commits; it is
/// best effort and never throws, because the change itself already succeeded.
/// </summary>
public interface IRealtimeNotifier
{
    Task ChangedAsync(
        string topic,
        IReadOnlyCollection<Guid> userIds,
        IReadOnlyCollection<Permission> permissions,
        CancellationToken ct
    );
}
