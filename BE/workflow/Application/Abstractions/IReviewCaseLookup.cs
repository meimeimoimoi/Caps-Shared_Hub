using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Reads several cases at once, for staff screens that only hold case ids.</summary>
public interface IReviewCaseLookup
{
    /// <summary>The cases with these ids, untracked; unknown ids are skipped.</summary>
    Task<IReadOnlyList<ReviewCase>> ListByIdsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken ct
    );

    /// <summary>How many open cases the user is in, as the client and as the expert.</summary>
    Task<(int AsClient, int AsExpert)> CountOpenForUserAsync(Guid userId, CancellationToken ct);

    /// <summary>
    /// Whether the document has a case that has not ended yet, whatever the version or the expert. Locks the
    /// document row until the transaction ends, so two bookings of one document run one after the other.
    /// </summary>
    Task<bool> HasOpenCaseForUpdateAsync(Guid documentId, CancellationToken ct);
}
