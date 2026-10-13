using Caps.Auth.Application.Abstractions;
using Caps.Auth.Domain;
using DnsClient;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Caps.Auth.Infrastructure.Email;

/// <summary>Email deliverability settings ("EmailPolicy" section): MX lookup, DNS timeout, trusted domains.</summary>
public sealed class EmailPolicyOptions
{
    /// <summary>Check that the domain accepts mail (MX/A records). DNS failures pass, so nobody is blocked by mistake.</summary>
    public bool CheckMx { get; set; } = true;
    public int DnsTimeoutSeconds { get; set; } = 3;

    /// <summary>Domains that skip the DNS check (e.g. caps.test in dev/test; .test does not exist).</summary>
    public string[] TrustedDomains { get; set; } = [];
}

/// <summary>
/// Reject unusable emails before creating the account: disposable email services and domains that
/// cannot receive mail. Expert review results and every security link are sent by email, so it must be real.
/// </summary>
public sealed class EmailDomainPolicy(
    IOptions<EmailPolicyOptions> options,
    IMemoryCache cache,
    ILogger<EmailDomainPolicy> logger
) : IEmailDomainPolicy
{
    private readonly EmailPolicyOptions o = options.Value;

    // Common disposable email services; subdomains match too (e.g. abc.mailinator.com).
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
            return; // Format is already validated by the DTO
        var domain = email[(at + 1)..].Trim().TrimEnd('.').ToLowerInvariant();

        if (IsDisposable(domain))
            throw AuthErrors.EmailDisposable();
        if (!o.CheckMx || o.TrustedDomains.Contains(domain, StringComparer.OrdinalIgnoreCase))
            return;
        if (!await AcceptsMail(domain, ct))
            throw AuthErrors.EmailDomainInvalid();
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
                // No MX: per SMTP, mail can still be delivered to the domain's A/AAAA record
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
            // DNS did not answer: do not block users because of our own infrastructure failure
            logger.LogWarning(e, "MX lookup failed for {Domain}; allowing registration", domain);
            return true;
        }
        cache.Set(("mx", domain), accepts, TimeSpan.FromHours(1));
        return accepts;
    }
}
