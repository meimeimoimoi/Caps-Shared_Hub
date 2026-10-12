using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Business;

public sealed class BusinessProfile
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public string CompanyName { get; set; } = default!;
    public string TaxCode { get; set; } = default!;
    public string? Address { get; set; }
    public string? Representative { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public void Update(
        string companyName,
        string taxCode,
        string? address,
        string? representative,
        string? contactEmail,
        string? contactPhone,
        DateTimeOffset now
    )
    {
        CompanyName = companyName.Trim();
        TaxCode = taxCode.Trim();
        Address = address?.Trim();
        Representative = representative?.Trim();
        ContactEmail = contactEmail?.Trim();
        ContactPhone = contactPhone?.Trim();
        UpdatedAt = now;
    }
}
