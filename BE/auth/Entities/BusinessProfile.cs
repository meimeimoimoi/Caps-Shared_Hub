using Caps.Common.Database;

namespace auth.Entities;

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
}
