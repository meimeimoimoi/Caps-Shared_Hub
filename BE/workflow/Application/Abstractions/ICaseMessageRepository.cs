using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Messages between the parties of review cases.</summary>
public interface ICaseMessageRepository
{
    /// <summary>One message of the case, untracked.</summary>
    Task<CaseMessage?> FindAsync(Guid reviewCaseId, Guid messageId, CancellationToken ct);

    /// <summary>
    /// Up to <paramref name="limit"/> messages of the case, oldest first, untracked. With
    /// <paramref name="after"/> it returns the oldest ones after it (polling); otherwise the newest ones,
    /// before <paramref name="before"/> when given (scrolling back).
    /// </summary>
    Task<IReadOnlyList<CaseMessage>> ListAsync(
        Guid reviewCaseId,
        DateTimeOffset? before,
        DateTimeOffset? after,
        int limit,
        CancellationToken ct
    );

    /// <summary>Per case the user takes part in: messages from the other party after the user's read marker.</summary>
    Task<IReadOnlyDictionary<Guid, int>> CountUnreadAsync(Guid userId, CancellationToken ct);

    void Add(CaseMessage message);
}
