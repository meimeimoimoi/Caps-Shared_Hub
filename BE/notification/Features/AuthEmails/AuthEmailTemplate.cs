using System.Text.Encodings.Web;
using Caps.Contracts;
using Caps.Notification.Email;

namespace Caps.Notification.Features.AuthEmails;

/// <summary>
/// Verification / password reset email content. The HTML uses tables + inline styles because many
/// mail clients (Gmail, Outlook) strip style tags and do not support flex/grid.
/// </summary>
public static class AuthEmailTemplate
{
    /// <summary>Content-ID of the logo embedded in the email (see EmailAssets).</summary>
    public const string LogoCid = EmailAssets.LogoContentId;

    private const string Brand = "Shared Hub";
    private const string Tagline = "Tra cứu luật thuế TNDN và soạn hồ sơ có trích dẫn.";
    private const string Accent = "#cc4a00";
    private const string Ink = "#1c2833";
    private const string Body = "#4a4f57";
    private const string Muted = "#7a7f87";
    private const string Font = "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

    // Vietnam has no daylight saving time, so use a fixed UTC+7 regardless of the server time zone.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public sealed record Content(string Subject, string Html, string Text);

    private sealed record Copy(
        string Subject,
        string Preheader,
        string Icon,
        string Heading,
        string Intro,
        string Button,
        string IgnoreTitle,
        string Ignore
    );

    private static Copy For(string purpose) =>
        purpose == "VERIFY_EMAIL"
            ? new(
                $"Xác nhận địa chỉ email của bạn – {Brand}",
                "Chỉ còn một bước để kích hoạt tài khoản của bạn.",
                "✉️",
                "Xác nhận địa chỉ email",
                $"Cảm ơn bạn đã đăng ký {Brand}. Hãy xác nhận đây là email của bạn để kích hoạt tài khoản.",
                "Xác nhận email",
                "Không phải bạn đăng ký?",
                "Hãy bỏ qua email này. Tài khoản sẽ không được kích hoạt nếu không có xác nhận."
            )
            : new(
                $"Đặt lại mật khẩu – {Brand}",
                "Bấm vào liên kết để tạo mật khẩu mới cho tài khoản của bạn.",
                "🔒",
                "Đặt lại mật khẩu",
                $"Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản {Brand} của bạn.",
                "Đặt mật khẩu mới",
                "Không phải bạn yêu cầu?",
                "Hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn giữ nguyên và không ai có thể đổi nó nếu không có liên kết này."
            );

    public static Content Build(AuthEmailRequestedEvent m)
    {
        var copy = For(m.Purpose);
        var local = m.ExpiresAt.ToOffset(VietnamOffset);
        var expires = local.ToString("HH:mm 'ngày' dd/MM/yyyy");
        // Only verification emails carry a 6-digit code; it expires sooner than the link
        var code =
            m.Code is { Length: > 0 } c && m.CodeExpiresAt is { } at
                ? new OneTimeCode(c, at.ToOffset(VietnamOffset).ToString("HH:mm"))
                : null;
        return new(
            copy.Subject,
            Html(copy, m.Link, m.Email, expires, local.Year, code),
            Text(copy, m.Link, m.Email, expires, local.Year, code)
        );
    }

    private sealed record OneTimeCode(string Value, string ValidUntil);

    private static string Text(
        Copy c,
        string link,
        string email,
        string expires,
        int year,
        OneTimeCode? code
    ) =>
        $"""
            {Brand} · {c.Heading}

            {c.Intro}

            {(
                code == null
                    ? ""
                    : $"Mã xác nhận: {code.Value} (hiệu lực đến {code.ValidUntil})\n\n"
            )}{c.Button}: {link}

            Liên kết hết hạn lúc {expires} (giờ Việt Nam) và chỉ dùng được một lần.

            {c.IgnoreTitle} {c.Ignore}

            —
            {Brand} · {Tagline}
            Email này được gửi tự động tới {email}, vui lòng không trả lời.
            © {year} {Brand}
            """;

    private static string Html(
        Copy c,
        string link,
        string email,
        string expires,
        int year,
        OneTimeCode? code
    )
    {
        // Encode every dynamic value up front so the HTML below only interpolates plain variables.
        var e = HtmlEncoder.Default;
        var href = e.Encode(link);
        var subject = e.Encode(c.Subject);
        // Inboxes show a preview line next to the subject: with a code, the user sees it right away
        var preheader = e.Encode(
            code == null ? c.Preheader : $"Mã xác nhận của bạn là {code.Value}."
        );
        var codeBlock =
            code == null
                ? ""
                : $"""
                    <p style="margin:0 0 10px;font-size:13px;color:{Muted};">Mã xác nhận của bạn</p>
                    <div style="display:inline-block;margin:0 0 10px;padding:14px 18px 14px 28px;background:#fff7f1;border:1px solid #ffe2cf;border-radius:12px;font-family:'Courier New',Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:{Ink};">{e.Encode(
                        code.Value
                    )}</div>
                    <p style="margin:0 0 28px;font-size:13px;line-height:1.6;color:{Muted};">Nhập mã trên trang đăng ký đang mở. Mã có hiệu lực đến <strong style="color:{Ink};">{e.Encode(
                        code.ValidUntil
                    )}</strong>. Hoặc bấm nút bên dưới.</p>
                    """;
        var heading = e.Encode(c.Heading);
        var intro = e.Encode(c.Intro);
        var button = e.Encode(c.Button);
        var ignoreTitle = e.Encode(c.IgnoreTitle);
        var ignore = e.Encode(c.Ignore);
        var to = e.Encode(email);
        var until = e.Encode(expires);
        var icon = c.Icon;
        return $"""
            <!doctype html>
            <html lang="vi">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light">
            <title>{subject}</title>
            </head>
            <body style="margin:0;padding:0;background:#f6f3ef;-webkit-text-size-adjust:100%;">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{preheader}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f3ef;">
              <tr><td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
                  <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #ece6df;overflow:hidden;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:{Accent};border-radius:16px 16px 0 0;">&nbsp;</td></tr>
                      <tr><td align="center" style="padding:32px 40px 28px;border-bottom:1px solid #f0ebe5;">
                        <img src="cid:{LogoCid}" width="180" height="42" alt="{Brand}" style="display:block;border:0;outline:none;width:180px;height:auto;">
                      </td></tr>
                      <tr><td align="center" style="padding:36px 40px 0;font-family:{Font};">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" width="64" height="64" style="width:64px;height:64px;border-radius:32px;background:#fff1e8;font-size:30px;line-height:64px;">{icon}</td>
                        </tr></table>
                        <h1 style="margin:24px 0 12px;font-size:26px;line-height:1.3;font-weight:700;color:{Ink};">{heading}</h1>
                        <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:{Body};">{intro}</p>
                        {codeBlock}
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" bgcolor="{Accent}" style="border-radius:10px;background:{Accent};">
                            <a href="{href}" target="_blank" style="display:inline-block;padding:16px 40px;font-family:{Font};font-size:16px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">{button}</a>
                          </td>
                        </tr></table>
                      </td></tr>
                      <tr><td style="padding:32px 40px 0;font-family:{Font};">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7f1;border:1px solid #ffe2cf;border-radius:10px;">
                          <tr><td style="padding:14px 18px;font-size:13px;line-height:1.7;color:{Body};">
                            ⏱&nbsp; Liên kết hết hạn lúc <strong style="color:{Ink};">{until}</strong> (giờ Việt Nam) và chỉ dùng được <strong style="color:{Ink};">một lần</strong>.
                          </td></tr>
                        </table>
                        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:{Muted};">Nút không hoạt động? Sao chép liên kết sau và dán vào trình duyệt:</p>
                        <p style="margin:6px 0 0;font-size:12px;line-height:1.6;word-break:break-all;"><a href="{href}" target="_blank" style="color:{Accent};text-decoration:underline;">{href}</a></p>
                      </td></tr>
                      <tr><td style="padding:32px 40px 40px;font-family:{Font};">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f7f8;border-radius:10px;">
                          <tr><td style="padding:16px 18px;font-size:13px;line-height:1.6;color:{Muted};">
                            <strong style="color:{Ink};">{ignoreTitle}</strong> {ignore}
                          </td></tr>
                        </table>
                      </td></tr>
                    </table>
                  </td></tr>
                  <tr><td align="center" style="padding:28px 24px 0;font-family:{Font};font-size:12px;line-height:1.7;color:{Muted};">
                    <strong style="color:{Ink};">{Brand}</strong> · {Tagline}<br>
                    Email này được gửi tự động tới <span style="color:{Ink};">{to}</span>, vui lòng không trả lời.<br>
                    © {year} {Brand}
                  </td></tr>
                </table>
              </td></tr>
            </table>
            </body>
            </html>
            """;
    }
}
