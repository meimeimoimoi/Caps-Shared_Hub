using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.UnitTests;

public sealed class CatalogTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);

    private static PlatformFee Rate(int percent) =>
        PlatformFee.Set("cit-review", percent, Guid.NewGuid(), Now);

    private static ServiceOffering Offering(long fee = 500_000, int hours = 48) =>
        ServiceOffering.Create(Guid.NewGuid(), Rate(20), fee, hours, Now);

    [Theory]
    [InlineData(1_000_000, 25, 750_000)]
    [InlineData(999_000, 33, 669_330)]
    [InlineData(10_000, 0, 10_000)]
    [InlineData(1_000_000, 99, 10_000)]
    public void Net_amount_is_the_fee_minus_the_platform_percent(long fee, int percent, long net) =>
        Assert.Equal(net, Rate(percent).NetOf(fee));

    [Theory]
    [InlineData(0)]
    [InlineData(PlatformFee.MaxPercent)]
    public void Platform_fee_at_the_limits_is_accepted(int percent) =>
        Assert.Equal(percent, Rate(percent).Percent);

    [Theory]
    [InlineData(-1)]
    [InlineData(PlatformFee.MaxPercent + 1)]
    public void Platform_fee_outside_0_to_99_is_rejected(int percent) =>
        Assert.Equal("PLATFORM_FEE_INVALID", Errors.CodeOf(() => Rate(percent)));

    [Theory]
    [InlineData(" CIT-Review ", "cit-review")]
    [InlineData("cit-consultation", "cit-consultation")]
    [InlineData("tax2", "tax2")]
    public void Service_codes_are_normalized(string raw, string code) =>
        Assert.Equal(code, PlatformFee.NormalizeServiceType(raw));

    [Theory]
    [InlineData("")]
    [InlineData("cit review")]
    [InlineData("cit--review")]
    [InlineData("-cit")]
    [InlineData("cit-")]
    [InlineData("cit_review")]
    public void Malformed_service_codes_are_rejected(string raw) =>
        Assert.Equal(
            "SERVICE_TYPE_INVALID",
            Errors.CodeOf(() => PlatformFee.NormalizeServiceType(raw))
        );

    [Fact]
    public void Service_codes_longer_than_50_characters_are_rejected()
    {
        var code = new string('a', 51);

        Assert.Equal(
            "SERVICE_TYPE_INVALID",
            Errors.CodeOf(() => PlatformFee.NormalizeServiceType(code))
        );
        Assert.Equal(new string('a', 50), PlatformFee.NormalizeServiceType(new string('a', 50)));
    }

    [Fact]
    public void An_offering_takes_the_normalized_service_code_of_its_rate()
    {
        var rate = PlatformFee.Set(" CIT-Review ", 20, Guid.NewGuid(), Now);

        var offering = ServiceOffering.Create(Guid.NewGuid(), rate, 500_000, 48, Now);

        Assert.Equal("cit-review", offering.ServiceType);
    }

    [Theory]
    [InlineData(ServiceOffering.MinFee)]
    [InlineData(ServiceOffering.MaxFee)]
    public void Fee_at_the_limits_is_accepted(long fee) =>
        Assert.Equal(fee, Offering(fee: fee).Fee);

    [Theory]
    [InlineData(ServiceOffering.MinFee - ServiceOffering.FeeStep)]
    [InlineData(ServiceOffering.MaxFee + ServiceOffering.FeeStep)]
    [InlineData(150_500)]
    [InlineData(0)]
    [InlineData(-10_000)]
    public void Fee_outside_the_limits_is_rejected(long fee) =>
        Assert.Equal("FEE_INVALID", Errors.CodeOf(() => Offering(fee: fee)));

    [Theory]
    [InlineData(1)]
    [InlineData(ServiceOffering.MaxTurnaroundHours)]
    public void Turnaround_at_the_limits_is_accepted(int hours) =>
        Assert.Equal(hours, Offering(hours: hours).TurnaroundHours);

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(ServiceOffering.MaxTurnaroundHours + 1)]
    public void Turnaround_outside_the_limits_is_rejected(int hours) =>
        Assert.Equal("TURNAROUND_INVALID", Errors.CodeOf(() => Offering(hours: hours)));

    [Fact]
    public void Repricing_changes_fee_and_turnaround_and_keeps_the_offering()
    {
        var offering = Offering();
        var id = offering.Id;

        offering.Reprice(800_000, 24);

        Assert.Equal((id, 800_000L, 24), (offering.Id, offering.Fee, offering.TurnaroundHours));
    }

    [Fact]
    public void Repricing_with_bad_values_keeps_the_old_price()
    {
        var offering = Offering(fee: 500_000, hours: 48);

        Assert.Equal("FEE_INVALID", Errors.CodeOf(() => offering.Reprice(150_500, 24)));
        Assert.Equal((500_000L, 48), (offering.Fee, offering.TurnaroundHours));
    }
}
