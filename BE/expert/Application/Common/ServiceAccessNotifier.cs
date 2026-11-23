using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the service access message from the qualification and its profile, then enqueues it.</summary>
public sealed class ServiceAccessNotifier(
    IServiceCatalogRepository catalog,
    IExpertNotificationOutbox outbox
) : IServiceAccessNotifier
{
    public async Task EnqueueAsync(
        ExpertServiceQualification qualification,
        QualificationEvent changed,
        string change,
        CancellationToken ct
    )
    {
        var profile = qualification.ExpertProfile;
        if (profile.ContactEmail == null)
            return;
        var service = await catalog.FindAsync(qualification.ServiceCode, ct);
        outbox.Enqueue(
            new ExpertServiceAccessChangedEvent(
                changed.Id,
                profile.UserId,
                profile.ContactEmail,
                profile.DisplayName ?? profile.ContactEmail,
                qualification.Id,
                qualification.ServiceCode,
                service?.Name ?? qualification.ServiceCode,
                change,
                changed.Note,
                changed.CreatedAt
            ),
            changed.CreatedAt
        );
    }
}
