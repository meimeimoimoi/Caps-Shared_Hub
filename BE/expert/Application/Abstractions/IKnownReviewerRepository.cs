using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Reviewers this service has seen, with their email, for showing claim holders and handing reviews on.</summary>
public interface IKnownReviewerRepository
{
    /// <summary>The reviewer, tracked for changes.</summary>
    Task<KnownReviewer?> FindAsync(Guid userId, CancellationToken ct);

    /// <summary>Email of each of these reviewers that is known.</summary>
    Task<IReadOnlyDictionary<Guid, string?>> FindEmailsAsync(
        IReadOnlyCollection<Guid> userIds,
        CancellationToken ct
    );

    /// <summary>Every known reviewer, by email.</summary>
    Task<IReadOnlyList<KnownReviewer>> ListAsync(CancellationToken ct);

    void Add(KnownReviewer reviewer);
}
