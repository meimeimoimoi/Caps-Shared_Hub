using System.ComponentModel.DataAnnotations;
using Caps.Billing.Domain;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Adds or changes a credit package; the domain checks the limits.</summary>
/// <param name="Credits">Credits added per purchase, 1 to 1,000,000.</param>
/// <param name="Price">VND, 10,000 to 50,000,000; null keeps the package unbuyable until a price is set.</param>
/// <param name="OnSale">Shown to buyers.</param>
/// <param name="Recommended">Highlighted as the suggested package.</param>
/// <param name="Order">Display position, 1 to 999.</param>
public sealed record SaveCreditPackageRequest(
    [Required, MaxLength(CreditPackage.MaxNameLength)] string? Name,
    long Credits,
    long? Price,
    bool OnSale,
    bool Recommended,
    int Order
)
{
    public CreditPackageDetails ToDetails() =>
        new(Name, Credits, Price, OnSale, Recommended, Order);
}
