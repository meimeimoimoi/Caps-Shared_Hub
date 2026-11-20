using System.Linq.Expressions;
using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Caps.Expert.Infrastructure.Ai;

/// <summary>
/// Background worker that extracts uploaded Gate 1 CV files once via the internal ai-service
/// and finalizes or times out active Gate 1 screening runs.
/// </summary>
public sealed class EvidenceScreeningWorker(
    IServiceScopeFactory scopes,
    EvidenceScreeningWakeup wakeup,
    TimeProvider clock,
    ILogger<EvidenceScreeningWorker> logger
) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan StaleProcessingWindow = TimeSpan.FromMinutes(3);

    /// <summary>Selects Gate 1 uploaded CV files awaiting extraction or recovery after a stale lock.</summary>
    public static Expression<Func<ExpertEvidence, bool>> PendingExtractionFilter(
        DateTimeOffset staleBefore
    ) =>
        x =>
            x.QualificationId == null
            && x.SourceUrl == null
            && x.EvidenceType == ApplicationRules.CvCode
            && (
                x.ExtractionStatus == ExtractionStatuses.Pending
                || (
                    x.ExtractionStatus == ExtractionStatuses.Processing
                    && x.ExtractedAt != null
                    && x.ExtractedAt < staleBefore
                )
            );

    /// <summary>Allows AI extraction strictly for Gate 1 CV evidence files.</summary>
    public static bool IsExtractableEvidenceType(string? evidenceType) =>
        evidenceType == ApplicationRules.CvCode;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingExtractionsAsync(stoppingToken);
                await ProcessRunningRunsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Screening worker cycle failed; will retry.");
            }

            await wakeup.WaitAsync(PollInterval, stoppingToken);
        }
    }

    private async Task ProcessPendingExtractionsAsync(CancellationToken ct)
    {
        List<Guid> pendingIds;
        var staleBefore = clock.GetUtcNow() - StaleProcessingWindow;
        using (var queryScope = scopes.CreateScope())
        {
            var db = queryScope.ServiceProvider.GetRequiredService<ExpertDbContext>();
            pendingIds = await db
                .ExpertEvidences.AsNoTracking()
                .Where(PendingExtractionFilter(staleBefore))
                .OrderBy(x => x.CreatedAt)
                .Select(x => x.Id)
                .Take(10)
                .ToListAsync(ct);
        }

        foreach (var evidenceId in pendingIds)
        {
            if (ct.IsCancellationRequested)
                break;
            await ExtractSingleFileAsync(evidenceId, staleBefore, ct);
        }
    }

    private async Task ExtractSingleFileAsync(
        Guid evidenceId,
        DateTimeOffset staleBefore,
        CancellationToken ct
    )
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ExpertDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var aiClient = scope.ServiceProvider.GetRequiredService<IAiCvScreeningClient>();
        var policies = scope.ServiceProvider.GetRequiredService<IExpertPolicyProvider>();
        var coordinator = scope.ServiceProvider.GetRequiredService<IScreeningCoordinator>();

        var now = clock.GetUtcNow();
        var claimed = await db
            .ExpertEvidences.Where(x =>
                x.Id == evidenceId
                && (
                    x.ExtractionStatus == ExtractionStatuses.Pending
                    || (
                        x.ExtractionStatus == ExtractionStatuses.Processing
                        && x.ExtractedAt != null
                        && x.ExtractedAt < staleBefore
                    )
                )
            )
            .ExecuteUpdateAsync(
                s =>
                    s.SetProperty(x => x.ExtractionStatus, ExtractionStatuses.Processing)
                        .SetProperty(x => x.ExtractedAt, now),
                ct
            );
        if (claimed == 0)
            return;

        var info = await db
            .ExpertEvidences.AsNoTracking()
            .Where(x => x.Id == evidenceId)
            .Select(x => new
            {
                x.FileUrl,
                x.FileName,
                x.ContentType,
                x.EvidenceType,
            })
            .SingleOrDefaultAsync(ct);
        if (info == null || !IsExtractableEvidenceType(info.EvidenceType))
            return;

        try
        {
            await using var stream = await storage.OpenAsync(info.FileUrl, ct);
            await using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, ct);

            var visionEnabled = (await policies.GetScreeningAsync(ct)).VisionEnabled;
            var extraction = await aiClient.ExtractAsync(
                buffer.ToArray(),
                info.FileName,
                info.ContentType,
                info.EvidenceType,
                visionEnabled,
                ct
            );

            var tracked = await db.ExpertEvidences.SingleOrDefaultAsync(
                x => x.Id == evidenceId,
                ct
            );
            if (tracked == null)
                return;

            var serialized = coordinator.SerializeExtraction(extraction);
            var completedAt = clock.GetUtcNow();
            if (extraction.Status == ExtractionOutcomes.Extracted)
            {
                tracked.MarkExtracted(serialized, completedAt);
            }
            else if (
                extraction.Status
                is ExtractionOutcomes.Unreadable
                    or ExtractionOutcomes.VisionDisabled
            )
            {
                tracked.MarkUnreadable(serialized, completedAt);
            }
            else
            {
                tracked.MarkExtractionFailed();
            }

            await db.SaveChangesAsync(ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Failed extracting evidence {EvidenceId} ({EvidenceType}).",
                evidenceId,
                info.EvidenceType
            );
            var tracked = await db.ExpertEvidences.SingleOrDefaultAsync(
                x => x.Id == evidenceId,
                ct
            );
            if (tracked != null)
            {
                tracked.MarkExtractionFailed();
                await db.SaveChangesAsync(ct);
            }
        }
    }

    private async Task ProcessRunningRunsAsync(CancellationToken ct)
    {
        IReadOnlyList<ScreeningRun> activeRuns;
        using (var queryScope = scopes.CreateScope())
        {
            var repo = queryScope.ServiceProvider.GetRequiredService<IScreeningRepository>();
            activeRuns = await repo.ListRunningRunsAsync(ct);
        }

        foreach (var activeRun in activeRuns)
        {
            if (ct.IsCancellationRequested)
                break;

            using var scope = scopes.CreateScope();
            var applications =
                scope.ServiceProvider.GetRequiredService<IExpertApplicationRepository>();
            var applicantUserId = await applications.FindApplicantUserIdAsync(
                activeRun.ApplicationId,
                ct
            );
            if (applicantUserId == null)
                continue;

            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var locks = scope.ServiceProvider.GetRequiredService<IApplicantLock>();
            var screeningRepo = scope.ServiceProvider.GetRequiredService<IScreeningRepository>();
            var evidences = scope.ServiceProvider.GetRequiredService<IExpertEvidenceRepository>();
            var coordinator = scope.ServiceProvider.GetRequiredService<IScreeningCoordinator>();
            var realtime = scope.ServiceProvider.GetRequiredService<IRealtimeNotifier>();

            await using var tx = await unitOfWork.BeginTransactionAsync(ct);
            await locks.AcquireAsync(applicantUserId.Value, ct);

            // Re-read inside the applicant lock so late AI output is discarded if a reviewer already decided (Section 4 #4).
            var trackedRun = await screeningRepo.FindRunAsync(activeRun.Id, ct);
            if (trackedRun == null || trackedRun.Status != ScreeningRunStatuses.Running)
                continue;

            var application = await applications.FindWithProfileAsync(trackedRun.ApplicationId, ct);
            if (application == null)
                continue;

            var now = clock.GetUtcNow();
            if (application.Status != ExpertApplicationStatus.Submitted)
            {
                trackedRun.MarkSkipped(now);
                await unitOfWork.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                continue;
            }

            var files = await evidences.ListAsync(application.Id, ct);
            var history = await applications.ListEventsAsync(application.Id, ct);
            var snapshot =
                ExpertApplicationEvent.LatestSnapshot(history)
                ?? ProfileSnapshot.Of(
                    application.ExpertProfile,
                    application.ExpertProfile.ContactEmail,
                    []
                );

            var changed = await coordinator.TryFinishRunAsync(
                trackedRun,
                application,
                files,
                snapshot,
                now,
                ct
            );
            if (!changed)
                continue;

            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            try
            {
                // Notify reviewers and admins only; applicants must never see screening output (Section 5).
                await realtime.ChangedAsync(
                    ExpertRealtimeTopics.Applications,
                    [],
                    [Permission.ExpertReview],
                    ct
                );
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed publishing realtime screening update.");
            }
        }
    }
}
