using Caps.Contracts;
using Caps.Notification.Email;
using MassTransit;

namespace Caps.Notification.Features.AuthEmails;

/// <summary>Sends the verification / password reset emails the identity service requests through its outbox.</summary>
public sealed class AuthEmailConsumer(IEmailSender sender, TimeProvider clock)
    : IConsumer<AuthEmailRequestedEvent>
{
    private static readonly string[] Purposes = ["VERIFY_EMAIL", "RESET_PASSWORD"];

    public async Task Consume(ConsumeContext<AuthEmailRequestedEvent> context)
    {
        var m = context.Message;
        // An expired link is useless to the user, so a late message is dropped instead of sent
        if (m.ExpiresAt <= clock.GetUtcNow())
            return;
        if (!Purposes.Contains(m.Purpose))
            throw new InvalidOperationException("Unknown email purpose.");
        var content = AuthEmailTemplate.Build(m);
        await sender.SendAsync(
            new EmailMessage(
                m.Email,
                content.Subject,
                content.Text,
                content.Html,
                [EmailAssets.Logo]
            ),
            context.CancellationToken
        );
    }
}
