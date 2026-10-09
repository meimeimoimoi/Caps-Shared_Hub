using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;
using Caps.Common.Messaging;
using MassTransit;
namespace notification.Services;
public sealed class AuthEmailConsumer(IConfiguration config) : IConsumer<AuthEmailRequestedEvent>
{
    public async Task Consume(ConsumeContext<AuthEmailRequestedEvent> context)
    {
        var m = context.Message;
        if (m.ExpiresAt <= DateTimeOffset.UtcNow) return;
        if (m.Purpose != "VERIFY_EMAIL" && m.Purpose != "RESET_PASSWORD") throw new InvalidOperationException("Unknown email purpose.");
        var host = config["Smtp:Host"] ?? throw new InvalidOperationException("Smtp:Host is required.");
        using var smtp = new SmtpClient(host, config.GetValue<int>("Smtp:Port", 587)) { EnableSsl = config.GetValue<bool>("Smtp:EnableSsl", true) };
        if (!string.IsNullOrEmpty(config["Smtp:Username"])) smtp.Credentials = new NetworkCredential(config["Smtp:Username"], config["Smtp:Password"]);
        using var mail = new MailMessage(config["Smtp:From"] ?? throw new InvalidOperationException("Smtp:From is required."), m.Email)
        {
            Subject = m.Purpose == "VERIFY_EMAIL" ? "Verify your Shared-Hub email" : "Reset your Shared-Hub password",
            IsBodyHtml = true,
            Body = "<p><a href=\"" + HtmlEncoder.Default.Encode(m.Link) + "\">Continue</a></p><p>This link is single-use and expires.</p>"
        };
        await smtp.SendMailAsync(mail, context.CancellationToken);
    }
}
