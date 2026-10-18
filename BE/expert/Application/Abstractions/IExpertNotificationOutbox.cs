using Caps.Contracts;

namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Messages for other services, stored in the same transaction as the change they describe and published
/// afterwards, so a broker outage never loses or invents a notification.
/// </summary>
public interface IExpertNotificationOutbox
{
    void Enqueue(ExpertEligibilityDecidedEvent message, DateTimeOffset now);

    void Enqueue(ExpertCompetencyDecidedEvent message, DateTimeOffset now);
}
