namespace Caps.Expert.Domain.Catalog;

/// <summary>
/// A service Shared Hub offers through experts (e.g. HUMAN_VERIFICATION). The catalog is data managed by
/// Shared Hub: experts never create services, and adding one is a new row, not a code change.
/// </summary>
public sealed class ServiceCatalogItem
{
    public const string Active = "ACTIVE";
    public const string Inactive = "INACTIVE";

    private ServiceCatalogItem() { }

    /// <summary>Stable code used by qualifications, pricing and review cases.</summary>
    public string Code { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public string Status { get; } = Active;

    /// <summary>
    /// Delivery SLA in calendar hours from START (BR-M27); snapshotted on the Review Case at request time
    /// (BR-M35), so a later change never affects existing cases.
    /// </summary>
    public int DeliverySlaHours { get; private set; }

    /// <summary>Display order in lists.</summary>
    public int SortOrder { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsActive => Status == Active;

    public static ServiceCatalogItem Create(
        string code,
        string name,
        int deliverySlaHours,
        int sortOrder,
        DateTimeOffset now
    ) =>
        new()
        {
            Code = code,
            Name = name,
            DeliverySlaHours = deliverySlaHours,
            SortOrder = sortOrder,
            CreatedAt = now,
        };
}
