using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Expert applications with their history; the latest one is the current application.</summary>
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
