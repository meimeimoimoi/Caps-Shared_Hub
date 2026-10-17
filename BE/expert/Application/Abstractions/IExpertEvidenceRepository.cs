using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Uploaded evidence files of an application (metadata; the bytes live in object storage).</summary>
public interface IExpertEvidenceRepository
{
    /// <summary>Files of the application, oldest first.</summary>
    Task<IReadOnlyList<ExpertEvidence>> ListAsync(Guid applicationId, CancellationToken ct);
    Task<int> CountAsync(Guid applicationId, CancellationToken ct);
    Task<bool> HasCodeAsync(Guid applicationId, string code, CancellationToken ct);
    Task<bool> AnyAddedAfterAsync(Guid applicationId, DateTimeOffset? since, CancellationToken ct);
    Task<ExpertEvidence?> FindAsync(Guid evidenceId, Guid applicationId, CancellationToken ct);

    /// <summary>Untracked lookup restricted to files of the given account.</summary>
    Task<ExpertEvidence?> FindOwnedAsync(Guid evidenceId, Guid userId, CancellationToken ct);
    void Add(ExpertEvidence evidence);
    void Remove(ExpertEvidence evidence);
}
