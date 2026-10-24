using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Expert applications with their history; the latest one is the current application.</summary>
public interface IExpertApplicationRepository
{
    /// <summary>The most recent application of the profile, open or closed.</summary>
    Task<ExpertApplication?> FindLatestAsync(Guid profileId, CancellationToken ct);

    /// <summary>The application with its expert profile loaded, tracked for changes.</summary>
    Task<ExpertApplication?> FindWithProfileAsync(Guid applicationId, CancellationToken ct);

    /// <summary>Account id of the application's owner, without tracking anything.</summary>
    Task<Guid?> FindApplicantUserIdAsync(Guid applicationId, CancellationToken ct);

    /// <summary>Applications in the given status with their profiles, oldest submission first (review queue).</summary>
    Task<IReadOnlyList<ExpertApplication>> ListByStatusAsync(string status, CancellationToken ct);
    Task<IReadOnlyList<ExpertApplicationEvent>> ListEventsAsync(
        Guid applicationId,
        CancellationToken ct
    );

    /// <summary>
    /// Stores the claim with one conditional update: only while the application waits for Gate 1 and is free,
    /// expired or already the reviewer's. Returns false when another reviewer won; on success the tracked
    /// application is reloaded.
    /// </summary>
    /// <param name="expiredBefore">Claims started before this time have expired.</param>
    Task<bool> TryClaimAsync(
        ExpertApplication application,
        Guid reviewerUserId,
        DateTimeOffset now,
        DateTimeOffset expiredBefore,
        CancellationToken ct
    );

    void Add(ExpertApplication application);
    void AddEvent(ExpertApplicationEvent applicationEvent);
}
