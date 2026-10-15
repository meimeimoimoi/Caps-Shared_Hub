using System.Globalization;
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
    private const string Accent = "#cc4a00";
    private const string Ink = "#1c2833";
    private const string Body = "#4a4f57";
    private const string Line = "#ece6df";
    private const string Muted = "#7a7f87";
    private const string Font = "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

    // Vietnam has no daylight saving time, so use a fixed UTC+7 regardless of the server time zone.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Subject, HTML and plain-text body of one email.</summary>
    public sealed record Content(string Subject, string Html, string Text);

    private sealed record Copy(
        string Subject,
        string Preheader,
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
                "Xác nhận địa chỉ email",
                $"Cảm ơn bạn đã đăng ký {Brand}. Hãy xác nhận đây là email của bạn để kích hoạt tài khoản.",
                "Xác nhận email",
                "Không phải bạn đăng ký?",
                "Hãy bỏ qua email này, tài khoản sẽ không được kích hoạt."
            )
            : new(
                $"Đặt lại mật khẩu – {Brand}",
                "Bấm vào liên kết để tạo mật khẩu mới cho tài khoản của bạn.",
                "Đặt lại mật khẩu",
                $"Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản {Brand} của bạn.",
                "Đặt mật khẩu mới",
                "Không phải bạn yêu cầu?",
                "Hãy bỏ qua email này, mật khẩu của bạn vẫn giữ nguyên."
            );

    public static Content Build(AuthEmailRequestedEvent m)
    {
        var copy = For(m.Purpose);
        var local = m.ExpiresAt.ToOffset(VietnamOffset);
        var expires = local.ToString("HH:mm 'ngày' dd/MM/yyyy", CultureInfo.InvariantCulture);
        // Only verification emails carry a 6-digit code; it expires sooner than the link
        var code =
            m.Code is { Length: > 0 } c && m.CodeExpiresAt is { } at
                ? new OneTimeCode(
                    c,
                    at.ToOffset(VietnamOffset).ToString("HH:mm", CultureInfo.InvariantCulture)
                )
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

            {(
                code == null
                    ? $"Liên kết dùng được một lần, hết hạn lúc {expires} (giờ Việt Nam).\n\n"
                    : ""
            )}{c.IgnoreTitle} {c.Ignore}

            —
            Email tự động gửi tới {email}, vui lòng không trả lời.
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
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;background:#fff7f1;border:1px solid #ffe2cf;border-radius:12px;">
                      <tr><td align="center" style="padding:20px 16px;">
                        <p style="margin:0 0 10px;font-size:13px;color:{Muted};">Mã xác nhận của bạn</p>
                        <p style="margin:0;padding-left:12px;font-family:'Courier New',Consolas,monospace;font-size:38px;font-weight:700;line-height:1.1;letter-spacing:12px;color:{Accent};">{e.Encode(
                        code.Value
                    )}</p>
                        <p style="margin:10px 0 0;font-size:13px;color:{Muted};">Hiệu lực đến <strong style="color:{Ink};">{e.Encode(
                        code.ValidUntil
                    )}</strong></p>
                      </td></tr>
                    </table>
                    """;
        var heading = e.Encode(c.Heading);
        var intro = e.Encode(c.Intro);
        var button = e.Encode(c.Button);
        var ignoreTitle = e.Encode(c.IgnoreTitle);
        var ignore = e.Encode(c.Ignore);
        var to = e.Encode(email);
        // With a code the email already shows the code's expiry; a second date reads as a duplicate
        var linkExpiry =
            code == null
                ? $"""<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:{Muted};">Liên kết dùng được một lần, hết hạn lúc {e.Encode(
                    expires
                )} (giờ Việt Nam).</p>"""
                : "";
        // One centered column: logo, heading, short intro, the action, then small print
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
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
                  <tr><td align="center" style="background:#ffffff;border-radius:12px;border:1px solid {Line};padding:36px 40px;font-family:{Font};text-align:center;">
                    <img src="cid:{LogoCid}" width="140" height="33" alt="{Brand}" style="display:block;margin:0 auto;border:0;outline:none;width:140px;height:auto;">
                    <h1 style="margin:32px 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:{Ink};">{heading}</h1>
                    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:{Body};">{intro}</p>
                    {codeBlock}
                    <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
                      <td bgcolor="{Accent}" style="border-radius:8px;background:{Accent};">
                        <a href="{href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:{Font};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">{button}</a>
                      </td>
                    </tr></table>
                    {linkExpiry}
                    <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid {Line};font-size:13px;line-height:1.6;color:{Muted};"><strong style="color:{Body};">{ignoreTitle}</strong> {ignore}</p>
                    <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:{Muted};">Nút không bấm được? Mở <a href="{href}" target="_blank" style="color:{Accent};text-decoration:underline;">liên kết này</a>.</p>
                  </td></tr>
                  <tr><td align="center" style="padding:20px 24px 0;font-family:{Font};font-size:12px;line-height:1.7;color:{Muted};">
                    Email tự động gửi tới {to}, vui lòng không trả lời. © {year} {Brand}
                  </td></tr>
                </table>
              </td></tr>
            </table>
            </body>
            </html>
            """;
    }
}
