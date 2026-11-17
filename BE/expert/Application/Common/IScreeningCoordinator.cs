using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Common;

/// <summary>
/// Coordinates Gate 1 automated pre-screening runs across application submissions, retries,
/// and background extraction completion.
/// </summary>
public interface IScreeningCoordinator
{
    /// <summary>
    /// Starts a screening run for a newly submitted or resubmitted application inside the caller's transaction.
    /// Evaluates immediate system checks and finishes immediately when all files were already extracted.
    /// </summary>
    Task<ScreeningRun> StartForSubmissionAsync(
        ExpertApplication application,
        ExpertApplicationEvent submissionEvent,
        int submissionNumber,
        IReadOnlyList<ExpertEvidence> trackedFiles,
        ProfileSnapshot snapshot,
        Guid triggeredByUserId,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>
    /// Retries a failed screening run on behalf of the claiming reviewer.
    /// Re-queues failed or unextracted files and starts a new run in the same transaction.
    /// </summary>
    Task<ScreeningRun> RetryAsync(
        ExpertApplication application,
        IReadOnlyList<ExpertEvidence> trackedFiles,
        IReadOnlyList<ExpertApplicationEvent> history,
        Guid reviewerUserId,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>
    /// Completes or times out a RUNNING screening run once all files settle or the AI timeout lapses.
    /// Returns true if the run transitioned and should be persisted.
    /// </summary>
    Task<bool> TryFinishRunAsync(
        ScreeningRun run,
        ExpertApplication application,
        IReadOnlyList<ExpertEvidence> files,
        ProfileSnapshot snapshot,
        DateTimeOffset now,
        CancellationToken ct
    );

    /// <summary>Parses stored JSON extraction metadata, returning null if empty or malformed.</summary>
    EvidenceExtraction? ParseExtraction(string? parsedMeta);

    /// <summary>Serializes extracted document metadata into the canonical JSON stored in parsed_meta.</summary>
    string SerializeExtraction(EvidenceExtraction extraction);
}
