namespace Caps.Auth.Application.Abstractions;

/// <summary>Rejects sign-ups with addresses that cannot receive mail (disposable or without MX records).</summary>
public interface IEmailDomainPolicy
{
    /// <summary>Throws EMAIL_DISPOSABLE / EMAIL_DOMAIN_INVALID (400) when the email cannot receive mail.</summary>
    Task EnsureDeliverableAsync(string email, CancellationToken ct);
}
