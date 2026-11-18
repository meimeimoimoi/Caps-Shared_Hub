using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>
/// A credit package sold through PayOS: buying it pays <see cref="Price"/> VND and adds <see cref="Credits"/>
/// credits. Packages are the only way to buy credits.
/// </summary>
public sealed class CreditPackage
{
    public const int MaxNameLength = 50;
    public const long MaxCredits = 1_000_000;
    public const int MaxSortOrder = 999;

    private CreditPackage() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string Name { get; private set; } = default!;
    public long Credits { get; private set; }

    /// <summary>VND; null while the price is not decided, and then the package cannot be bought.</summary>
    public long? Price { get; private set; }
    public bool OnSale { get; private set; }

    /// <summary>Highlighted as the suggested package.</summary>
    public bool Recommended { get; private set; }

    /// <summary>Display position, 1 first.</summary>
    public int SortOrder { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool IsForSale => OnSale && Price != null;

    public static CreditPackage Create(CreditPackageDetails details, DateTimeOffset now)
    {
        var package = new CreditPackage { CreatedAt = now };
        package.Update(details, now);
        return package;
    }

    public void Update(CreditPackageDetails details, DateTimeOffset now)
    {
        var name = details.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > MaxNameLength)
            throw BillingErrors.InvalidCreditPackage("name");
        if (details.Credits is < 1 or > MaxCredits)
            throw BillingErrors.InvalidCreditPackage("credits");
        // A price must be payable through PayOS, so it follows the top-up limits
        if (details.Price is < PaymentRules.MinTopupAmount or > PaymentRules.MaxTopupAmount)
        {
            throw BillingErrors.InvalidCreditPackage("price");
        }
        if (details.SortOrder is < 1 or > MaxSortOrder)
            throw BillingErrors.InvalidCreditPackage("order");

        Name = name;
        Credits = details.Credits;
        Price = details.Price;
        OnSale = details.OnSale;
        Recommended = details.Recommended;
        SortOrder = details.SortOrder;
        UpdatedAt = now;
    }
}

/// <summary>What an admin sets on a credit package.</summary>
public sealed record CreditPackageDetails(
    string? Name,
    long Credits,
    long? Price,
    bool OnSale,
    bool Recommended,
    int SortOrder
);
