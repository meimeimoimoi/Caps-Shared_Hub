namespace auth.Services.Interface;

public interface IEmailDomainPolicy
{
    /// <summary>Throws AuthFailure 400 (EMAIL_DISPOSABLE / EMAIL_DOMAIN_INVALID) when the email cannot receive mail.</summary>
    Task EnsureDeliverableAsync(string email, CancellationToken ct);
}
