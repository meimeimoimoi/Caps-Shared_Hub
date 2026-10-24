namespace Caps.Contracts;

/// <summary>
/// Server data changed for some accounts. Any service publishes it after committing; the notification service
/// pushes the topic over SignalR so the matching clients refetch. It carries no business data.
/// </summary>
/// <param name="Id">Event id.</param>
/// <param name="Topic">What changed, e.g. "expert.applications"; the client maps it to the queries to refetch.</param>
/// <param name="UserIds">Accounts that see the data directly (the owner).</param>
/// <param name="Permissions">Every connected account holding one of these permissions (e.g. a review queue).</param>
public sealed record RealtimeChangedEvent(
    Guid Id,
    string Topic,
    IReadOnlyList<Guid> UserIds,
    IReadOnlyList<string> Permissions,
    DateTimeOffset OccurredAt
);
