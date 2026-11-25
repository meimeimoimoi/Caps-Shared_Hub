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
}
