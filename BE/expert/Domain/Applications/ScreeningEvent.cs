using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>Audit event types recorded solely for reviewers and system admins.</summary>
public static class ScreeningEventTypes
{
    public const string RunStarted = "RUN_STARTED";
    public const string RunCompleted = "RUN_COMPLETED";
    public const string RunFailed = "RUN_FAILED";
    public const string RunSkipped = "RUN_SKIPPED";
    public const string RunRetried = "RUN_RETRIED";
    public const string PointChecked = "POINT_CHECKED";
    public const string PointUsedForSupplement = "POINT_USED_FOR_SUPPLEMENT";
    public const string PointReopened = "POINT_REOPENED";
    public const string SupplementAssigned = "SUPPLEMENT_ASSIGNED";
}

/// <summary>
/// Internal Gate 1 screening history entry; visible only to reviewers and system admins (never the applicant).
/// </summary>
public sealed class ScreeningEvent
{
    private ScreeningEvent() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ApplicationId { get; private set; }
    public Guid ScreeningRunId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public bool BySystem { get; private set; }
    public string EventType { get; private set; } = default!;
    public string Message { get; private set; } = default!;
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Creates an audit entry for a screening run lifecycle transition or reviewer action.</summary>
    public static ScreeningEvent Record(
        Guid applicationId,
        Guid screeningRunId,
        Guid actorUserId,
        bool bySystem,
        string eventType,
        string message,
        DateTimeOffset now
    ) =>
        new()
        {
            ApplicationId = applicationId,
            ScreeningRunId = screeningRunId,
            ActorUserId = actorUserId,
            BySystem = bySystem,
            EventType = eventType,
            Message = message,
            CreatedAt = now,
        };
}
