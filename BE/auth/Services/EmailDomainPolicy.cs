using auth.Services.Interface;
using DnsClient;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace auth.Services;

public sealed class EmailPolicyOptions
{
    /// <summary>Kiểm tra tên miền có nhận thư (bản ghi MX/A). Lỗi DNS thì cho qua, không chặn nhầm.</summary>
    public bool CheckMx { get; set; } = true;
    public int DnsTimeoutSeconds { get; set; } = 3;

    /// <summary>Tên miền bỏ qua kiểm tra DNS (vd. caps.test khi dev/test; .test không có thật).</summary>
    public string[] TrustedDomains { get; set; } = [];
}

/// <summary>
/// Chặn email không dùng được trước khi tạo tài khoản: dịch vụ email dùng một lần và tên miền không
/// nhận thư. Kết quả xét duyệt chuyên gia và mọi liên kết bảo mật đều gửi qua email nên email phải thật.
/// </summary>
public sealed class EmailDomainPolicy(
    IOptions<EmailPolicyOptions> options,
    IMemoryCache cache,
    ILogger<EmailDomainPolicy> logger
) : IEmailDomainPolicy
{
    private readonly EmailPolicyOptions o = options.Value;

    // Dịch vụ email tạm phổ biến; so khớp cả tên miền con (vd. abc.mailinator.com).
    private static readonly HashSet<string> Disposable = new(StringComparer.OrdinalIgnoreCase)
    {
        "10minutemail.com",
        "10minutemail.net",
        "20minutemail.com",
        "33mail.com",
        "anonaddy.me",
        "burnermail.io",
        "discard.email",
        "dispostable.com",
        "dropmail.me",
        "emailondeck.com",
        "fakeinbox.com",
        "fakemail.net",
        "getairmail.com",
        "getnada.com",
        "guerrillamail.biz",
        "guerrillamail.com",
        "guerrillamail.de",
        "guerrillamail.info",
        "guerrillamail.net",
        "guerrillamail.org",
        "guerrillamailblock.com",
        "harakirimail.com",
        "inboxkitten.com",
        "jetable.org",
        "mail.tm",
        "mail-temp.com",
        "maildrop.cc",
        "mailcatch.com",
        "mailinator.com",
        "mailinator.net",
        "mailnesia.com",
        "mailpoof.com",
        "mintemail.com",
        "mohmal.com",
        "moakt.com",
        "mytemp.email",
        "nada.email",
        "sharklasers.com",
        "spam4.me",
        "spamgourmet.com",
        "temp-mail.io",
        "temp-mail.org",
        "tempail.com",
        "tempmail.com",
        "tempmail.dev",
        "tempmail.net",
        "tempmailo.com",
        "tempr.email",
        "throwawaymail.com",
        "trashmail.com",
        "trashmail.de",
        "trashmail.net",
        "tmail.ws",
        "tmpmail.net",
        "tmpmail.org",
        "yopmail.com",
        "yopmail.fr",
        "yopmail.net",
        "emailfake.com",
        "fakemailgenerator.com",
        "linshiyouxiang.net",
        "minuteinbox.com",
        "mailsac.com",
        "inboxbear.com",
    };

    private static bool IsDisposable(string domain)
    {
        for (var d = domain; d.Length > 0; )
        {
            if (Disposable.Contains(d))
                return true;
            var dot = d.IndexOf('.');
            if (dot < 0)
                return false;
            d = d[(dot + 1)..];
        }
        return false;
    }

    public async Task EnsureDeliverableAsync(string email, CancellationToken ct)
    {
        var at = email.LastIndexOf('@');
        if (at <= 0 || at == email.Length - 1)
            return; // Định dạng đã được kiểm tra ở DTO
        var domain = email[(at + 1)..].Trim().TrimEnd('.').ToLowerInvariant();

        if (IsDisposable(domain))
            throw new AuthFailure(
                400,
                "EMAIL_DISPOSABLE",
                "Temporary email addresses are not accepted. Use an email you check regularly."
            );
        if (!o.CheckMx || o.TrustedDomains.Contains(domain, StringComparer.OrdinalIgnoreCase))
            return;
        if (!await AcceptsMail(domain, ct))
            throw new AuthFailure(
                400,
                "EMAIL_DOMAIN_INVALID",
                "This email domain cannot receive email. Check the address for typos."
            );
    }

    private async Task<bool> AcceptsMail(string domain, CancellationToken ct)
    {
        if (cache.TryGetValue(("mx", domain), out bool cached))
            return cached;
        bool accepts;
        try
        {
            var dns = new LookupClient(
                new LookupClientOptions
                {
                    Timeout = TimeSpan.FromSeconds(o.DnsTimeoutSeconds),
                    Retries = 1,
                    UseCache = true,
                }
            );
            var mx = await dns.QueryAsync(domain, QueryType.MX, cancellationToken: ct);
            if (mx.Header.ResponseCode == DnsHeaderResponseCode.NotExistentDomain)
                accepts = false;
            else if (mx.Answers.MxRecords().Any())
                accepts = true;
            else
            {
                // Không có MX: theo chuẩn SMTP vẫn gửi được tới bản ghi A/AAAA của tên miền
                var a = await dns.QueryAsync(domain, QueryType.A, cancellationToken: ct);
                accepts = a.Answers.ARecords().Any() || a.Answers.AaaaRecords().Any();
            }
        }
        catch (Exception e)
            when (e
                    is DnsResponseException
                        or OperationCanceledException
                        or System.Net.Sockets.SocketException
            )
        {
            if (ct.IsCancellationRequested)
                throw;
            // DNS không trả lời: không chặn người dùng vì lỗi hạ tầng của chính mình
            logger.LogWarning(e, "MX lookup failed for {Domain}; allowing registration", domain);
            return true;
        }
        cache.Set(("mx", domain), accepts, TimeSpan.FromHours(1));
        return accepts;
    }
}
