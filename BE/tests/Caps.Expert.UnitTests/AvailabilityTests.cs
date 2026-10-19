using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

public sealed class AvailabilityTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);

    private static ExpertProfile NewProfile() =>
        ExpertProfile.Create(Guid.NewGuid(), "expert", Now);

    [Fact]
    public void Accepting_with_an_offering_turns_the_service_on()
    {
        var profile = NewProfile();

        profile.SetAvailability(accepting: true, capacity: 3, activeOfferings: 1, Now);

        Assert.Equal(ExpertServiceStatus.Active, profile.ServiceStatus);
        Assert.Equal(3, profile.Capacity);
    }

    [Fact]
    public void Accepting_without_an_offering_is_rejected() =>
        Assert.Equal(
            "NOT_READY_TO_ACCEPT",
            Errors.CodeOf(() => NewProfile().SetAvailability(true, 3, activeOfferings: 0, Now))
        );

    [Fact]
    public void Pausing_is_allowed_without_offerings_and_keeps_the_capacity()
    {
        var profile = NewProfile();

        profile.SetAvailability(accepting: false, capacity: 5, activeOfferings: 0, Now);

        Assert.Equal((ExpertServiceStatus.Inactive, 5), (profile.ServiceStatus, profile.Capacity));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(ExpertProfile.MaxCapacity + 1)]
    public void Capacity_outside_the_allowed_range_is_rejected(int capacity) =>
        Assert.Equal(
            "CAPACITY_INVALID",
            Errors.CodeOf(() =>
                NewProfile().SetAvailability(true, capacity, activeOfferings: 1, Now)
            )
        );

    [Theory]
    [InlineData(1)]
    [InlineData(ExpertProfile.MaxCapacity)]
    public void Capacity_at_the_limits_is_accepted(int capacity)
    {
        var profile = NewProfile();

        profile.SetAvailability(true, capacity, activeOfferings: 1, Now);

        Assert.Equal(capacity, profile.Capacity);
    }

    [Fact]
    public void A_bad_capacity_is_reported_before_missing_offerings() =>
        Assert.Equal(
            "CAPACITY_INVALID",
            Errors.CodeOf(() => NewProfile().SetAvailability(true, 0, activeOfferings: 0, Now))
        );
}
