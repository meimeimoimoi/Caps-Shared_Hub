using Caps.Contracts;
using Caps.Notification.Email;
using Caps.Notification.Features.ExpertDecisions;
using MassTransit;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Features.Payouts;

/// <summary>
/// The daily payout summary: emails the operations inbox (Notifications:PayoutEmail). No inbox configured, no
/// email; the admin payout table shows the same deadlines in-app.
/// </summary>
public sealed class PayoutDigestConsumer(
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    IConfiguration config
) : IConsumer<PayoutDigestEvent>
{
    public async Task Consume(ConsumeContext<PayoutDigestEvent> context)
    {
        if (config["Notifications:PayoutEmail"] is not { Length: > 0 } inbox)
            return;
        var content = ExpertDecisionEmailTemplate.BuildPayoutDigest(
            context.Message,
            inbox,
            links.Value.Link("/admin/escrow")
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
