using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Files the parties added to review cases.</summary>
public interface IReviewAttachmentRepository
{
    /// <summary>The case's files, oldest first, untracked.</summary>
    Task<IReadOnlyList<ReviewAttachment>> ListAsync(Guid reviewCaseId, CancellationToken ct);

    /// <summary>One file of the case, untracked; null when it belongs to another case.</summary>
    Task<ReviewAttachment?> FindAsync(Guid reviewCaseId, Guid attachmentId, CancellationToken ct);

    /// <summary>Tracks a new file.</summary>
    void Add(ReviewAttachment attachment);

    /// <summary>The document version a case reviews, untracked.</summary>
    Task<DocumentVersion?> FindSourceAsync(Guid versionId, CancellationToken ct);
}
