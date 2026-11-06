using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

public sealed class CreditPackageTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 8, 0, 0, TimeSpan.Zero);

    private static CreditPackageDetails Details(
        string? name = "Gói 30",
        long credits = 30,
        long? price = 50_000,
        int order = 2
    ) => new(name, credits, price, true, true, order);

    [Fact]
    public void A_package_keeps_its_details_with_a_trimmed_name()
    {
        var package = CreditPackage.Create(Details(name: "  Gói 30 "), Now);

        Assert.Equal("Gói 30", package.Name);
        Assert.Equal(30, package.Credits);
        Assert.Equal(50_000, package.Price);
        Assert.Equal(2, package.SortOrder);
        Assert.True(package.Recommended);
        Assert.True(package.IsForSale);
        Assert.Equal(Now, package.CreatedAt);
    }

    [Fact]
    public void A_package_without_a_price_is_not_for_sale()
    {
        var package = CreditPackage.Create(Details(), Now);

        package.Update(Details(price: null), Now.AddDays(1));

        Assert.True(package.OnSale);
        Assert.False(package.IsForSale);
        Assert.Equal(Now.AddDays(1), package.UpdatedAt);
    }

    [Theory]
    [InlineData(" ", 30, 50_000L, 2)]
    [InlineData("123456789012345678901234567890123456789012345678901", 30, 50_000L, 2)]
    [InlineData("Gói 30", 0, 50_000L, 2)]
    [InlineData("Gói 30", 1_000_001, 50_000L, 2)]
    [InlineData("Gói 30", 30, 9_999L, 2)]
    [InlineData("Gói 30", 30, 50_000_001L, 2)]
    [InlineData("Gói 30", 30, 50_000L, 0)]
    [InlineData("Gói 30", 30, 50_000L, 1_000)]
    public void Details_outside_the_limits_are_rejected(
        string name,
        long credits,
        long? price,
        int order
    ) =>
        Assert.Equal(
            "INVALID_CREDIT_PACKAGE",
            Errors.CodeOf(() => CreditPackage.Create(Details(name, credits, price, order), Now))
        );
}
