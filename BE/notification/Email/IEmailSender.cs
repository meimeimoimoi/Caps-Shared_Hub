namespace Caps.Notification.Email;

/// <summary>An image shown inside the HTML body through <c>cid:</c>, so it renders without internet access.</summary>
public sealed record InlineImage(string ContentId, byte[] Content, string ContentType);

/// <summary>A ready-to-send email: plain text for any client, HTML for clients that can render it.</summary>
public sealed record EmailMessage(
    string To,
    string Subject,
    string Text,
    string Html,
    IReadOnlyList<InlineImage> Images
);

/// <summary>Delivers an email; features build the content and never deal with the transport.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct);
}
