using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Abstractions;

public interface IExpertProfileRepository
{
    Task<ExpertProfile?> FindByUserAsync(Guid userId, CancellationToken ct);
    void Add(ExpertProfile profile);
}

public interface IExpertApplicationRepository
{
    /// <summary>The most recent application of the profile, open or closed.</summary>
    Task<ExpertApplication?> FindLatestAsync(Guid profileId, CancellationToken ct);
    Task<IReadOnlyList<ExpertApplicationEvent>> ListEventsAsync(
        Guid applicationId,
        CancellationToken ct
    );
    void Add(ExpertApplication application);
    void AddEvent(ExpertApplicationEvent applicationEvent);
}

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

public interface IUnitOfWork
{
    Task<ITransaction> BeginTransactionAsync(CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

/// <summary>Rolled back on dispose unless committed.</summary>
public interface ITransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct);
}

/// <summary>
/// Serializes changes of one applicant (save draft, upload, submit) inside the current transaction,
/// including the very first save when no row exists yet to lock.
/// </summary>
public interface IApplicantLock
{
    Task AcquireAsync(Guid userId, CancellationToken ct);
}
