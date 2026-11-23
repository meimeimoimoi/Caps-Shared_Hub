using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Files a Gate 2 qualification can rely on: those of its Gate 1 application and those added for the
/// service while more evidence was requested.
/// </summary>
public interface IQualificationEvidenceRepository
{
    /// <summary>Gate 1 files first, then the qualification's own files, oldest first.</summary>
    Task<IReadOnlyList<ExpertEvidence>> ListAsync(
        ExpertServiceQualification qualification,
        CancellationToken ct
    );

    /// <summary>Files added for the service (not counting the Gate 1 files).</summary>
    Task<int> CountAddedAsync(Guid qualificationId, CancellationToken ct);
    Task<bool> AnyAddedAfterAsync(Guid qualificationId, DateTimeOffset since, CancellationToken ct);

    /// <summary>One of the files the qualification can rely on, tracked for changes.</summary>
    Task<ExpertEvidence?> FindAsync(
        Guid evidenceId,
        ExpertServiceQualification qualification,
        CancellationToken ct
    );
}
