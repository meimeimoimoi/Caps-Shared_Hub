using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core store for Gate 1 screening runs, points, and internal screening events.</summary>
public sealed class ScreeningRepository(ExpertDbContext db) : IScreeningRepository
{
    public Task<ScreeningRun?> FindLatestRunAsync(Guid applicationId, CancellationToken ct) =>
        db
            .ScreeningRuns.Where(x => x.ApplicationId == applicationId)
            .OrderByDescending(x => x.StartedAt)
            .ThenByDescending(x => x.Id)
            .FirstOrDefaultAsync(ct);

    public Task<ScreeningRun?> FindRunAsync(Guid runId, CancellationToken ct) =>
        db.ScreeningRuns.SingleOrDefaultAsync(x => x.Id == runId, ct);

    public async Task<IReadOnlyList<ScreeningRun>> ListRunningRunsAsync(CancellationToken ct) =>
        await db
            .ScreeningRuns.AsNoTracking()
            .Where(x => x.Status == ScreeningRunStatuses.Running)
            .OrderBy(x => x.StartedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ScreeningPoint>> ListPointsAsync(
        Guid runId,
        CancellationToken ct
    ) =>
        await db
            .ScreeningPoints.AsNoTracking()
            .Where(x => x.ScreeningRunId == runId)
            .OrderBy(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

    public Task<ScreeningPoint?> FindPointAsync(Guid pointId, Guid runId, CancellationToken ct) =>
        db.ScreeningPoints.SingleOrDefaultAsync(
            x => x.Id == pointId && x.ScreeningRunId == runId,
            ct
        );

    public Task<int> CountOpenPointsAsync(Guid runId, CancellationToken ct) =>
        db.ScreeningPoints.CountAsync(
            x => x.ScreeningRunId == runId && x.Status == ScreeningPointStatuses.Open,
            ct
        );

    public async Task<IReadOnlySet<Guid>> ListResolvedSupplementEvidenceIdsAsync(
        Guid applicationId,
        CancellationToken ct
    )
    {
        var ids = await db
            .ScreeningPoints.AsNoTracking()
            .Where(x =>
                x.ApplicationId == applicationId
                && x.Code == ScreeningPointCodes.SysUnclassifiedSupplement
                && x.Status != ScreeningPointStatuses.Open
                && x.EvidenceId != null
            )
            .Select(x => x.EvidenceId!.Value)
            .Distinct()
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    public async Task<IReadOnlyList<ScreeningEvent>> ListEventsAsync(
        Guid applicationId,
        CancellationToken ct
    ) =>
        await db
            .ScreeningEvents.AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderBy(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

    public async Task<
        IReadOnlyDictionary<Guid, (string Status, int OpenPointCount)>
    > GetLatestSummaryByApplicationAsync(
        IReadOnlyCollection<Guid> applicationIds,
        CancellationToken ct
    )
    {
        if (applicationIds.Count == 0)
            return new Dictionary<Guid, (string Status, int OpenPointCount)>();

        var runs = await db
            .ScreeningRuns.AsNoTracking()
            .Where(x => applicationIds.Contains(x.ApplicationId))
            .OrderByDescending(x => x.StartedAt)
            .ThenByDescending(x => x.Id)
            .Select(x => new
            {
                x.ApplicationId,
                x.Id,
                x.Status,
            })
            .ToListAsync(ct);

        var latestByApp = runs.GroupBy(x => x.ApplicationId).Select(g => g.First()).ToArray();
        if (latestByApp.Length == 0)
            return new Dictionary<Guid, (string Status, int OpenPointCount)>();

        var latestRunIds = latestByApp.Select(x => x.Id).ToArray();
        var openCounts = await db
            .ScreeningPoints.AsNoTracking()
            .Where(x =>
                latestRunIds.Contains(x.ScreeningRunId) && x.Status == ScreeningPointStatuses.Open
            )
            .GroupBy(x => x.ScreeningRunId)
            .Select(g => new { RunId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RunId, x => x.Count, ct);

        return latestByApp.ToDictionary(
            x => x.ApplicationId,
            x => (x.Status, openCounts.GetValueOrDefault(x.Id))
        );
    }

    public void AddRun(ScreeningRun run) => db.ScreeningRuns.Add(run);

    public void AddPoints(IEnumerable<ScreeningPoint> points) =>
        db.ScreeningPoints.AddRange(points);

    public void AddEvent(ScreeningEvent screeningEvent) => db.ScreeningEvents.Add(screeningEvent);
}
