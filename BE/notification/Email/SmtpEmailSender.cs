using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Email;

/// <summary>Bound from the "Smtp" section. Development points at Mailpit (127.0.0.1:1025, no TLS).</summary>
public sealed class SmtpOptions
{
    [Required]
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;

    [Required, EmailAddress]
    public string From { get; set; } = "";
    public string FromName { get; set; } = "Shared Hub";
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public sealed class SmtpEmailSender(IOptions<SmtpOptions> options) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        var o = options.Value;
        using var smtp = new SmtpClient(o.Host, o.Port) { EnableSsl = o.EnableSsl };
        if (!string.IsNullOrEmpty(o.Username))
            smtp.Credentials = new NetworkCredential(o.Username, o.Password);
        using var mail = new MailMessage(
            new MailAddress(o.From, o.FromName, Encoding.UTF8),
            new MailAddress(message.To)
        )
        {
            Subject = message.Subject,
            SubjectEncoding = Encoding.UTF8,
            // Body is plain text; the HTML version is attached so mail clients pick what they can render.
            Body = message.Text,
            BodyEncoding = Encoding.UTF8,
        };
        var html = AlternateView.CreateAlternateViewFromString(
            message.Html,
            Encoding.UTF8,
            MediaTypeNames.Text.Html
        );
        foreach (var image in message.Images)
            html.LinkedResources.Add(
                new LinkedResource(new MemoryStream(image.Content), image.ContentType)
                {
                    ContentId = image.ContentId,
                    TransferEncoding = TransferEncoding.Base64,
                }
            );
        mail.AlternateViews.Add(html);
        await smtp.SendMailAsync(mail, ct);
    }
}
