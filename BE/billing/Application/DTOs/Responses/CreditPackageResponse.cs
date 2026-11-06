using Caps.Billing.Domain;

namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>A credit package as shown in the wallet and to admins.</summary>
/// <param name="Price">VND; null while the price is not decided (the package cannot be bought yet).</param>
/// <param name="Order">Display position, 1 first.</param>
public sealed record CreditPackageResponse(
    string Id,
    string Name,
    long Credits,
    long? Price,
    bool OnSale,
    bool Recommended,
    int Order
)
{
    public static CreditPackageResponse From(CreditPackage x) =>
        new(x.Id.ToString(), x.Name, x.Credits, x.Price, x.OnSale, x.Recommended, x.SortOrder);
}
