using Caps.Contracts;
using Caps.Notification.Email;
using MassTransit;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Features.ExpertDecisions;

/// <summary>
/// An expert asked for a violation excuse: emails the operations inbox (Notifications:DisputeEmail) so a
/// System Admin reviews it. No inbox configured, no email.
/// </summary>
// ponytail: no sent marker, so a redelivered event mails the inbox twice; store one if that becomes noise
public sealed class ExpertExcuseRequestedConsumer(
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    IConfiguration config
) : IConsumer<ExpertExcuseRequestedEvent>
{
    public async Task Consume(ConsumeContext<ExpertExcuseRequestedEvent> context)
    {
        if (config["Notifications:DisputeEmail"] is not { Length: > 0 } inbox)
        {
            return;
        }
        var content = ExpertDecisionEmailTemplate.BuildExcuseRequestAlert(
            context.Message,
            inbox,
            links.Value.Link("/admin/experts/excuse-requests")
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
