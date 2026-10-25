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

    /// <summary>
    /// Approved qualifications taking requests, with their profiles, untracked: the Marketplace candidates
    /// before price, slots and account status are checked.
    /// </summary>
    /// <param name="serviceCode">Only this service; null for every service.</param>
    /// <param name="profileId">Only this expert; null for every expert.</param>
    Task<IReadOnlyList<ExpertServiceQualification>> ListMarketplaceCandidatesAsync(
        string? serviceCode,
        Guid? profileId,
        CancellationToken ct
    );

    /// <summary>
    /// Stores the claim with one conditional update: only while the qualification waits for Gate 2 and is free,
    /// expired or already the reviewer's. Returns false when another reviewer won; on success the tracked
    /// qualification is reloaded.
    /// </summary>
    /// <param name="expiredBefore">Claims started before this time have expired.</param>
    Task<bool> TryClaimAsync(
        ExpertServiceQualification qualification,
        Guid reviewerUserId,
        DateTimeOffset now,
        DateTimeOffset expiredBefore,
        CancellationToken ct
    );

    void Add(ExpertServiceQualification qualification);
    void AddEvent(QualificationEvent qualificationEvent);
}
