using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Finds (or opens) the applicant's current application.</summary>
public interface IApplicationLoader
{
    /// <summary>The open application, creating the profile and/or a new draft when needed.</summary>
    Task<(ExpertProfile Profile, ExpertApplication Application)> OpenOrCreateAsync(
        Applicant applicant,
        CancellationToken ct
    );

    /// <summary>The latest application; throws APPLICATION_NOT_FOUND when there is none.</summary>
    Task<(ExpertProfile Profile, ExpertApplication Application)> GetCurrentAsync(
        Guid userId,
        CancellationToken ct
    );
}
