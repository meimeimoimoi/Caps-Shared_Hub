using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Read side of the review queues. Filtering, counting and ordering (oldest submission first) run in the
/// database, so a page never loads the whole queue.
/// </summary>
public interface IReviewQueueReader
{
    /// <summary>Applications in these statuses whose expert name or email contains the search text.</summary>
    Task<int> CountApplicationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        ReviewQueueScope scope,
        CancellationToken ct
    );

    /// <summary>The first <paramref name="take"/> matching applications, oldest submission first.</summary>
    Task<IReadOnlyList<ReviewQueueRowResponse>> ListApplicationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        ReviewQueueScope scope,
        int take,
        CancellationToken ct
    );

    /// <summary>Qualifications in these statuses matching the expert name, email or one of the service codes.</summary>
    Task<int> CountQualificationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        ReviewQueueScope scope,
        CancellationToken ct
    );

    /// <summary>
    /// The first <paramref name="take"/> matching qualifications, oldest submission first; those waiting for
    /// final approval are ordered by their Gate 2 PASS time, so overdue ones come first.
    /// </summary>
    Task<IReadOnlyList<ReviewQueueRowResponse>> ListQualificationsAsync(
        IReadOnlyCollection<string> statuses,
        string? search,
        IReadOnlyCollection<string> matchingServiceCodes,
        ReviewQueueScope scope,
        int take,
        CancellationToken ct
    );

    /// <summary>Qualifications waiting for final approval whose Gate 2 PASS is older than the given time.</summary>
    Task<int> CountFinalApprovalsPassedBeforeAsync(
        DateTimeOffset passedBefore,
        CancellationToken ct
    );

    /// <summary>Applications per status.</summary>
    Task<IReadOnlyDictionary<string, int>> CountApplicationsByStatusAsync(CancellationToken ct);

    /// <summary>Qualifications per status.</summary>
    Task<IReadOnlyDictionary<string, int>> CountQualificationsByStatusAsync(CancellationToken ct);

    /// <summary>Applications per status that the scope's claim filter keeps.</summary>
    Task<IReadOnlyDictionary<string, int>> CountApplicationsByStatusAsync(
        ReviewQueueScope scope,
        CancellationToken ct
    );

    /// <summary>Qualifications per status that the scope's claim filter keeps.</summary>
    Task<IReadOnlyDictionary<string, int>> CountQualificationsByStatusAsync(
        ReviewQueueScope scope,
        CancellationToken ct
    );
}
