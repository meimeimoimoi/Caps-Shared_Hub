using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>Lifecycle states of one automated Gate 1 screening run (Section 4).</summary>
public static class ScreeningRunStatuses
{
    public const string Running = "RUNNING";
    public const string Completed = "COMPLETED";
    public const string Failed = "FAILED";
    public const string Skipped = "SKIPPED";
}

/// <summary>Common failure reasons recorded on a failed screening run.</summary>
public static class ScreeningFailureReasons
{
    public const string Timeout = "TIMEOUT";
    public const string AiUnavailable = "AI_UNAVAILABLE";
}

/// <summary>
/// One screening execution for an application submission (initial submit, supplement, or manual retry).
/// Holds system checks generated at submission and AI checks produced once non-EV-01 files are extracted.
/// </summary>
public sealed class ScreeningRun
{
    private ScreeningRun() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ApplicationId { get; private set; }
    public Guid? SubmissionEventId { get; private set; }
    public int SubmissionNumber { get; private set; }
    public int RunNumber { get; private set; }
    public string Status { get; private set; } = ScreeningRunStatuses.Running;
    public Guid TriggeredByUserId { get; private set; }
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset TimeoutAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? FailureReason { get; private set; }
    public int CheckedFileCount { get; private set; }

    public ICollection<ScreeningPoint> Points { get; } = [];

    /// <summary>Starts a new screening run in RUNNING state with the configured AI timeout deadline.</summary>
    public static ScreeningRun Start(
        Guid applicationId,
        Guid? submissionEventId,
        int submissionNumber,
        int runNumber,
        Guid triggeredByUserId,
        DateTimeOffset now,
        TimeSpan aiTimeout
    ) =>
        new()
        {
            ApplicationId = applicationId,
            SubmissionEventId = submissionEventId,
            SubmissionNumber = submissionNumber,
            RunNumber = runNumber,
            Status = ScreeningRunStatuses.Running,
            TriggeredByUserId = triggeredByUserId,
            StartedAt = now,
            TimeoutAt = now + aiTimeout,
        };

    public bool IsTimedOut(DateTimeOffset now) =>
        Status == ScreeningRunStatuses.Running && now >= TimeoutAt;

    public bool CanRetry => Status == ScreeningRunStatuses.Failed;

    /// <summary>Completes a running run after all extractable files and AI rules finish.</summary>
    public void MarkCompleted(int checkedFileCount, DateTimeOffset now)
    {
        if (Status != ScreeningRunStatuses.Running)
            return;
        Status = ScreeningRunStatuses.Completed;
        CheckedFileCount = checkedFileCount;
        CompletedAt = now;
    }

    /// <summary>Marks a running run as failed due to timeout or AI service unavailability.</summary>
    public void MarkFailed(string reason, int checkedFileCount, DateTimeOffset now)
    {
        if (Status != ScreeningRunStatuses.Running)
            return;
        Status = ScreeningRunStatuses.Failed;
        FailureReason = reason;
        CheckedFileCount = checkedFileCount;
        CompletedAt = now;
    }

    /// <summary>Marks a running run as skipped when a reviewer concludes Gate 1 first.</summary>
    public void MarkSkipped(DateTimeOffset now)
    {
        if (Status != ScreeningRunStatuses.Running)
            return;
        Status = ScreeningRunStatuses.Skipped;
        CompletedAt = now;
    }
}
