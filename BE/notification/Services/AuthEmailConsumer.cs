using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using Caps.Common.Messaging;
using MassTransit;

namespace notification.Services;

public sealed class AuthEmailConsumer(IConfiguration config) : IConsumer<AuthEmailRequestedEvent>
{
    public async Task Consume(ConsumeContext<AuthEmailRequestedEvent> context)
    {
        var m = context.Message;
        if (m.ExpiresAt <= DateTimeOffset.UtcNow)
            return;
        if (m.Purpose != "VERIFY_EMAIL" && m.Purpose != "RESET_PASSWORD")
            throw new InvalidOperationException("Unknown email purpose.");
        var host =
            config["Smtp:Host"] ?? throw new InvalidOperationException("Smtp:Host is required.");
        using var smtp = new SmtpClient(host, config.GetValue<int>("Smtp:Port", 587))
        {
            EnableSsl = config.GetValue<bool>("Smtp:EnableSsl", true),
        };
        if (!string.IsNullOrEmpty(config["Smtp:Username"]))
            smtp.Credentials = new NetworkCredential(
                config["Smtp:Username"],
                config["Smtp:Password"]
            );
        var content = AuthEmailTemplate.Build(m);
        var from = new MailAddress(
            config["Smtp:From"] ?? throw new InvalidOperationException("Smtp:From is required."),
            config["Smtp:FromName"] ?? "Shared Hub",
            Encoding.UTF8
        );
        // Body là bản chữ thuần; bản HTML gửi kèm để ứng dụng mail tự chọn bản hiển thị được.
        using var mail = new MailMessage(from, new MailAddress(m.Email))
        {
            Subject = content.Subject,
            SubjectEncoding = Encoding.UTF8,
            Body = content.Text,
            BodyEncoding = Encoding.UTF8,
        };
        var html = AlternateView.CreateAlternateViewFromString(
            content.Html,
            Encoding.UTF8,
            MediaTypeNames.Text.Html
        );
        // Logo đi kèm trong email (cid:), hiển thị được cả khi máy nhận không truy cập được web.
        html.LinkedResources.Add(
            new LinkedResource(new MemoryStream(Logo), "image/png")
            {
                ContentId = AuthEmailTemplate.LogoCid,
                TransferEncoding = TransferEncoding.Base64,
            }
        );
        mail.AlternateViews.Add(html);
        await smtp.SendMailAsync(mail, context.CancellationToken);
    }

    private static readonly byte[] Logo = ReadLogo();

    private static byte[] ReadLogo()
    {
        using var stream =
            typeof(AuthEmailConsumer).Assembly.GetManifestResourceStream(
                "notification.email-logo.png"
            ) ?? throw new InvalidOperationException("Embedded email logo is missing.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
