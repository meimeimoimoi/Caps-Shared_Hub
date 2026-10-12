namespace auth.Services.Interface;

public interface IEmailDomainPolicy
{
    /// <summary>Ném AuthFailure 400 (EMAIL_DISPOSABLE / EMAIL_DOMAIN_INVALID) nếu email không nhận được thư.</summary>
    Task EnsureDeliverableAsync(string email, CancellationToken ct);
}
