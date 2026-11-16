using Caps.Contracts;
using Caps.Notification.Email;
using Caps.Notification.Features.ExpertDecisions;
using MassTransit;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Features.ReviewCases;

/// <summary>
/// A dispute passed its decision deadline: emails the operations inbox (Notifications:DisputeEmail) so the
/// case is decided. No inbox configured, no email.
/// </summary>
// ponytail: no sent marker, so a redelivered event mails the inbox twice; store one if that becomes noise
public sealed class ReviewCaseDisputeOverdueConsumer(
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    IConfiguration config
) : IConsumer<ReviewCaseDisputeOverdueEvent>
{
    public async Task Consume(ConsumeContext<ReviewCaseDisputeOverdueEvent> context)
    {
        if (config["Notifications:DisputeEmail"] is not { Length: > 0 } inbox)
        {
            return;
        }
        var m = context.Message;
        var content = ExpertDecisionEmailTemplate.BuildDisputeOverdueAlert(
            m,
            inbox,
            links.Value.Link($"/admin/disputes/{m.ReviewCaseId}")
        );
        await sender.SendAsync(
            new EmailMessage(
                inbox,
                content.Subject,
                content.Text,
                content.Html,
                [EmailAssets.Logo]
            ),
            context.CancellationToken
        );
    }
}
