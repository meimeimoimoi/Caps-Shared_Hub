using System.Text.Json;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Common;

/// <summary>Default implementation of <see cref="IScreeningCoordinator"/>.</summary>
public sealed class ScreeningCoordinator(
    IScreeningRepository screeningRepo,
    IExpertPolicyProvider policies
) : IScreeningCoordinator
{
    private static readonly JsonSerializerOptions MetaJson = new(JsonSerializerDefaults.Web);

    public async Task<ScreeningRun> StartForSubmissionAsync(
        ExpertApplication application,
        ExpertApplicationEvent submissionEvent,
        int submissionNumber,
        IReadOnlyList<ExpertEvidence> trackedFiles,
        ProfileSnapshot snapshot,
        Guid triggeredByUserId,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var previous = await screeningRepo.FindLatestRunAsync(application.Id, ct);
        if (previous?.Status == ScreeningRunStatuses.Running)
        {
            previous.MarkSkipped(now);
            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    application.Id,
                    previous.Id,
                    SystemActor.UserId,
                    true,
                    ScreeningEventTypes.RunSkipped,
                    "Lượt sàng lọc trước được đóng do chuyên gia nộp lại hồ sơ.",
                    now
                )
            );
        }

        var eligibilityPolicy = await policies.GetEligibilityAsync(ct);
        var screeningPolicy = await policies.GetScreeningAsync(ct);

        RequeueExtractableFiles(trackedFiles, screeningPolicy.VisionEnabled, retryAllFailed: true);

        var run = ScreeningRun.Start(
            application.Id,
            submissionEvent.Id,
            submissionNumber,
            runNumber: 1,
            triggeredByUserId,
            now,
            screeningPolicy.AiTimeout
        );
        screeningRepo.AddRun(run);

        return await InitializeRunAsync(
            run,
            trackedFiles,
            snapshot,
            eligibilityPolicy.MinYearsExperience,
            screeningPolicy,
            triggeredByUserId,
            bySystem: true,
            ScreeningEventTypes.RunStarted,
            "Bắt đầu lượt sàng lọc hồ sơ.",
            now,
            ct
        );
    }

    public async Task<ScreeningRun> RetryAsync(
        ExpertApplication application,
        IReadOnlyList<ExpertEvidence> trackedFiles,
        IReadOnlyList<ExpertApplicationEvent> history,
        Guid reviewerUserId,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var latest =
            await screeningRepo.FindLatestRunAsync(application.Id, ct)
            ?? throw ExpertErrors.ScreeningNotFound();
        if (!latest.CanRetry)
            throw ExpertErrors.ScreeningRunNotRetryable();

        var eligibilityPolicy = await policies.GetEligibilityAsync(ct);
        var screeningPolicy = await policies.GetScreeningAsync(ct);
        var snapshot =
            ExpertApplicationEvent.LatestSnapshot(history)
            ?? ProfileSnapshot.Of(
                application.ExpertProfile,
                application.ExpertProfile.ContactEmail,
                []
            );

        RequeueExtractableFiles(trackedFiles, screeningPolicy.VisionEnabled, retryAllFailed: true);

        var run = ScreeningRun.Start(
            application.Id,
            latest.SubmissionEventId,
            Math.Max(1, latest.SubmissionNumber),
            latest.RunNumber + 1,
            reviewerUserId,
            now,
            screeningPolicy.AiTimeout
        );
        screeningRepo.AddRun(run);

        return await InitializeRunAsync(
            run,
            trackedFiles,
            snapshot,
            eligibilityPolicy.MinYearsExperience,
            screeningPolicy,
            reviewerUserId,
            bySystem: false,
            ScreeningEventTypes.RunRetried,
            "Reviewer yêu cầu chạy lại AI sàng lọc.",
            now,
            ct
        );
    }

    public async Task<bool> TryFinishRunAsync(
        ScreeningRun run,
        ExpertApplication application,
        IReadOnlyList<ExpertEvidence> files,
        ProfileSnapshot snapshot,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        if (run.Status != ScreeningRunStatuses.Running)
            return false;

        var checkedCount = CountInspectableFiles(files);
        if (run.IsTimedOut(now))
        {
            run.MarkFailed(ScreeningFailureReasons.Timeout, checkedCount, now);
            screeningRepo.AddPoints([
                ScreeningEvaluator.CreateManualFallbackPoint(
                    run,
                    ScreeningFailureReasons.Timeout,
                    now
                ),
            ]);
            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    application.Id,
                    run.Id,
                    SystemActor.UserId,
                    true,
                    ScreeningEventTypes.RunFailed,
                    "AI sàng lọc quá thời gian chờ.",
                    now
                )
            );
            return true;
        }

        var extractables = files.Where(x => x.RequiresAiExtraction).ToArray();
        if (
            extractables.Any(x =>
                x.ExtractionStatus is ExtractionStatuses.Pending or ExtractionStatuses.Processing
            )
        )
        {
            return false;
        }

        if (extractables.Any(x => x.ExtractionStatus == ExtractionStatuses.Failed))
        {
            run.MarkFailed(ScreeningFailureReasons.AiUnavailable, checkedCount, now);
            screeningRepo.AddPoints([
                ScreeningEvaluator.CreateManualFallbackPoint(
                    run,
                    ScreeningFailureReasons.AiUnavailable,
                    now
                ),
            ]);
            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    application.Id,
                    run.Id,
                    SystemActor.UserId,
                    true,
                    ScreeningEventTypes.RunFailed,
                    "Không thể trích xuất dữ liệu từ AI.",
                    now
                )
            );
            return true;
        }

        var existingPoints = await screeningRepo.ListPointsAsync(run.Id, ct);
        var existingUnreadableIds = existingPoints
            .Where(p => p.Code == ScreeningPointCodes.SysUnreadableOrScan && p.EvidenceId.HasValue)
            .Select(p => p.EvidenceId!.Value)
            .ToHashSet();

        var newPoints = new List<ScreeningPoint>();
        var extractedPairs = new List<(ExpertEvidence Evidence, EvidenceExtraction Extraction)>();

        foreach (var ev in extractables)
        {
            var ext = ParseExtraction(ev.ParsedMeta);
            if (ext == null)
                continue;

            var postSystem = ScreeningEvaluator.EvaluatePostInspectionSystemPoint(
                run,
                ev,
                ext,
                existingUnreadableIds,
                now
            );
            if (postSystem != null)
            {
                newPoints.Add(postSystem);
                existingUnreadableIds.Add(ev.Id);
            }

            if (ext.Status == ExtractionOutcomes.Extracted)
                extractedPairs.Add((ev, ext));
        }

        newPoints.AddRange(ScreeningEvaluator.EvaluateAiChecks(run, snapshot, extractedPairs, now));
        if (newPoints.Count > 0)
            screeningRepo.AddPoints(newPoints);

        run.MarkCompleted(checkedCount, now);
        screeningRepo.AddEvent(
            ScreeningEvent.Record(
                application.Id,
                run.Id,
                SystemActor.UserId,
                true,
                ScreeningEventTypes.RunCompleted,
                "AI sàng lọc hoàn tất.",
                now
            )
        );
        return true;
    }

    public EvidenceExtraction? ParseExtraction(string? parsedMeta)
    {
        if (string.IsNullOrWhiteSpace(parsedMeta))
            return null;
        try
        {
            return JsonSerializer.Deserialize<EvidenceExtraction>(parsedMeta, MetaJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public string SerializeExtraction(EvidenceExtraction extraction) =>
        JsonSerializer.Serialize(extraction, MetaJson);

    private async Task<ScreeningRun> InitializeRunAsync(
        ScreeningRun run,
        IReadOnlyList<ExpertEvidence> files,
        ProfileSnapshot snapshot,
        int minYearsExperience,
        ScreeningPolicy screeningPolicy,
        Guid actorUserId,
        bool bySystem,
        string startEventType,
        string startMessage,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var extractions = new Dictionary<Guid, EvidenceExtraction>();
        foreach (var ev in files)
        {
            var parsed = ParseExtraction(ev.ParsedMeta);
            if (parsed != null)
                extractions[ev.Id] = parsed;
        }

        var resolvedSupplements = await screeningRepo.ListResolvedSupplementEvidenceIdsAsync(
            run.ApplicationId,
            ct
        );
        var systemPoints = ScreeningEvaluator.EvaluateSystemChecks(
            run,
            snapshot,
            files,
            extractions,
            resolvedSupplements,
            minYearsExperience,
            screeningPolicy,
            now
        );

        var pointsToAdd = new List<ScreeningPoint>(systemPoints);
        var extractables = files.Where(x => x.RequiresAiExtraction).ToArray();
        var pendingOrFailed = extractables.Any(x =>
            x.ExtractionStatus
                is ExtractionStatuses.Pending
                    or ExtractionStatuses.Processing
                    or ExtractionStatuses.Failed
        );

        if (!pendingOrFailed)
        {
            var extractedPairs = extractables
                .Select(ev => (Evidence: ev, Extraction: extractions.GetValueOrDefault(ev.Id)))
                .Where(x => x.Extraction is { Status: ExtractionOutcomes.Extracted })
                .Select(x => (x.Evidence, x.Extraction!))
                .ToArray();

            pointsToAdd.AddRange(
                ScreeningEvaluator.EvaluateAiChecks(run, snapshot, extractedPairs, now)
            );
            run.MarkCompleted(CountInspectableFiles(files), now);
            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    run.ApplicationId,
                    run.Id,
                    actorUserId,
                    bySystem,
                    startEventType,
                    startMessage,
                    now
                )
            );
            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    run.ApplicationId,
                    run.Id,
                    SystemActor.UserId,
                    true,
                    ScreeningEventTypes.RunCompleted,
                    "AI sàng lọc hoàn tất.",
                    now
                )
            );
        }
        else
        {
            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    run.ApplicationId,
                    run.Id,
                    actorUserId,
                    bySystem,
                    startEventType,
                    startMessage,
                    now
                )
            );
        }

        if (pointsToAdd.Count > 0)
            screeningRepo.AddPoints(pointsToAdd);

        return run;
    }

    private void RequeueExtractableFiles(
        IReadOnlyList<ExpertEvidence> files,
        bool visionEnabled,
        bool retryAllFailed
    )
    {
        foreach (var ev in files)
        {
            if (!ev.RequiresAiExtraction)
                continue;

            if (ev.ExtractionStatus == null)
            {
                ev.PrepareExtraction();
                continue;
            }

            if (retryAllFailed && ev.ExtractionStatus == ExtractionStatuses.Failed)
            {
                ev.QueueExtractionRetry();
                continue;
            }

            if (
                ev.ExtractionStatus == ExtractionStatuses.Unreadable
                && ShouldRequeueUnreadable(
                    ParseExtraction(ev.ParsedMeta),
                    visionEnabled,
                    retryAllFailed
                )
            )
            {
                ev.QueueExtractionRetry();
            }
        }
    }

    /// <summary>Returns true when an UNREADABLE extraction failed only due to disabled/unavailable OCR or vision.</summary>
    public static bool ShouldRequeueUnreadable(
        EvidenceExtraction? parsed,
        bool visionEnabled,
        bool retryAllFailed
    ) =>
        parsed != null
        && (
            (visionEnabled && parsed.Status == ExtractionOutcomes.VisionDisabled)
            || (retryAllFailed && parsed.UnreadableReason is "OCR_UNAVAILABLE" or "OCR_DISABLED")
        );

    private static int CountInspectableFiles(IReadOnlyList<ExpertEvidence> files) =>
        files.Count(x => x.QualificationId == null);
}
