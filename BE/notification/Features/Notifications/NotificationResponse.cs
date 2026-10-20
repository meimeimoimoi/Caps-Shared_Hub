using System.Text.Json;

namespace Caps.Notification.Features.Notifications;

/// <summary>One in-app notification; <see cref="Data"/> is the JSON object stored with it.</summary>
public sealed record NotificationResponse(
    Guid Id,
    string Type,
    JsonElement Data,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt
);

/// <summary>The newest notifications of the account and how many are unread in total.</summary>
public sealed record NotificationListResponse(
    IReadOnlyList<NotificationResponse> Items,
    int UnreadCount
);
