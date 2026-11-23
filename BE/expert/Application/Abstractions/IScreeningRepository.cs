using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Persistence port for Gate 1 screening runs, points, and internal screening events.</summary>
public interface IScreeningRepository
{
    /// <summary>Latest screening run of the application, tracked for updates.</summary>
    Task<ScreeningRun?> FindLatestRunAsync(Guid applicationId, CancellationToken ct);

    /// <summary>One screening run by id, tracked for updates.</summary>
    Task<ScreeningRun?> FindRunAsync(Guid runId, CancellationToken ct);

    /// <summary>Active RUNNING runs across all applications, oldest first.</summary>
    Task<IReadOnlyList<ScreeningRun>> ListRunningRunsAsync(CancellationToken ct);

    /// <summary>Points belonging to a screening run, ordered by creation time.</summary>
    Task<IReadOnlyList<ScreeningPoint>> ListPointsAsync(Guid runId, CancellationToken ct);

    /// <summary>One screening point belonging to the given run, tracked for updates.</summary>
    Task<ScreeningPoint?> FindPointAsync(Guid pointId, Guid runId, CancellationToken ct);

    /// <summary>Number of still-open points on the given run.</summary>
    Task<int> CountOpenPointsAsync(Guid runId, CancellationToken ct);

    /// <summary>Evidence ids of SUPPLEMENT files already checked in an earlier run of this application.</summary>
    Task<IReadOnlySet<Guid>> ListResolvedSupplementEvidenceIdsAsync(
        Guid applicationId,
        CancellationToken ct
    );

    /// <summary>Internal screening audit trail of the application, oldest first.</summary>
    Task<IReadOnlyList<ScreeningEvent>> ListEventsAsync(Guid applicationId, CancellationToken ct);

    /// <summary>Latest run status and open point count keyed by application id.</summary>
    Task<
        IReadOnlyDictionary<Guid, (string Status, int OpenPointCount)>
    > GetLatestSummaryByApplicationAsync(
        IReadOnlyCollection<Guid> applicationIds,
        CancellationToken ct
    );

    void AddRun(ScreeningRun run);
    void AddPoints(IEnumerable<ScreeningPoint> points);
    void AddEvent(ScreeningEvent screeningEvent);
}
