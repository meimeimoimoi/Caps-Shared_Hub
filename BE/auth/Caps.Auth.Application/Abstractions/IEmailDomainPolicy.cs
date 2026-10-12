namespace Caps.Auth.Application.Abstractions;

public interface IEmailDomainPolicy
{
    /// <summary>Throws EMAIL_DISPOSABLE / EMAIL_DOMAIN_INVALID (400) when the email cannot receive mail.</summary>
    Task EnsureDeliverableAsync(string email, CancellationToken ct);
}
