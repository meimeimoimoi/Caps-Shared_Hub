using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Expert-Service qualifications with their history; the latest one per service is the current one.</summary>
public interface IQualificationRepository
{
    /// <summary>The most recent qualification of the profile for the service, open or closed.</summary>
    Task<ExpertServiceQualification?> FindLatestAsync(
        Guid profileId,
        string serviceCode,
        CancellationToken ct
    );

    /// <summary>The latest qualification of each service the profile registered for.</summary>
    Task<IReadOnlyList<ExpertServiceQualification>> ListLatestByProfileAsync(
        Guid profileId,
        CancellationToken ct
    );

    /// <summary>The qualification if it belongs to the account, tracked for changes.</summary>
    Task<ExpertServiceQualification?> FindOwnedAsync(
        Guid qualificationId,
        Guid userId,
        CancellationToken ct
    );

    /// <summary>The qualification with its expert profile loaded, tracked for changes.</summary>
    Task<ExpertServiceQualification?> FindWithProfileAsync(
        Guid qualificationId,
        CancellationToken ct
    );

    /// <summary>Account id of the qualification's owner, without tracking anything.</summary>
    Task<Guid?> FindApplicantUserIdAsync(Guid qualificationId, CancellationToken ct);

    /// <summary>Qualifications in the given status with their profiles, oldest submission first (review queue).</summary>
    Task<IReadOnlyList<ExpertServiceQualification>> ListByStatusAsync(
        string status,
        CancellationToken ct
    );

    Task<IReadOnlyList<QualificationEvent>> ListEventsAsync(
        Guid qualificationId,
        CancellationToken ct
    );
    void Add(ExpertServiceQualification qualification);
    void AddEvent(QualificationEvent qualificationEvent);
}
