using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Loads the profile and current application, creating them on first use.</summary>
public sealed class ApplicationLoader(
    IExpertProfileRepository profiles,
    IExpertApplicationRepository applications,
    TimeProvider clock
) : IApplicationLoader
{
    public async Task<(ExpertProfile Profile, ExpertApplication Application)> OpenOrCreateAsync(
        Applicant applicant,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var profile = await profiles.FindByUserAsync(applicant.UserId, ct);
        ExpertApplication? latest = null;
        if (profile == null)
        {
            profile = ExpertProfile.Create(applicant.UserId, applicant.DefaultName, now);
            profiles.Add(profile);
        }
        else
        {
            latest = await applications.FindLatestAsync(profile.Id, ct);
        }

        profile.RecordContactEmail(applicant.Email);
        if (latest != null && !ExpertApplicationStatus.IsClosed(latest.Status))
            return (profile, latest);

        var (application, opened) = ExpertApplication.Open(
            profile.Id,
            latest,
            applicant.UserId,
            now
        );
        applications.Add(application);
        applications.AddEvent(opened);
        profile.MirrorStatus(application.Status, now);
        return (profile, application);
    }

    public async Task<(ExpertProfile Profile, ExpertApplication Application)> GetCurrentAsync(
        Guid userId,
        CancellationToken ct
    )
    {
        var profile =
            await profiles.FindByUserAsync(userId, ct) ?? throw ExpertErrors.ApplicationNotFound();
        var application =
            await applications.FindLatestAsync(profile.Id, ct)
            ?? throw ExpertErrors.ApplicationNotFound();
        return (profile, application);
    }
}
