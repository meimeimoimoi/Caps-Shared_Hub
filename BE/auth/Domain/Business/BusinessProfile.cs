using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Business;

/// <summary>Company details of a customer account (one per account).</summary>
public sealed class BusinessProfile
{
    private BusinessProfile() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }
    public User User { get; } = default!;

    public string CompanyName { get; private set; } = default!;
    public string TaxCode { get; private set; } = default!;
    public string? Address { get; private set; }
    public string? Representative { get; private set; }
    public string? ContactEmail { get; private set; }
    public string? ContactPhone { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static BusinessProfile Create(Guid userId, DateTimeOffset now) =>
        new()
        {
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now,
        };

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
