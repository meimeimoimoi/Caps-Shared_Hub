using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

public sealed class AvailabilityTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Accepting_sets_capacity_and_turns_the_service_on()
    {
        var profile = ExpertProfile.Create(Guid.NewGuid(), "expert", Now);

        profile.SetAvailability(accepting: true, capacity: 3, Now);

        Assert.Equal(ExpertServiceStatus.Active, profile.ServiceStatus);
        Assert.Equal(3, profile.Capacity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(ExpertProfile.MaxCapacity + 1)]
    public void Capacity_outside_the_allowed_range_is_rejected(int capacity)
    {
        var profile = ExpertProfile.Create(Guid.NewGuid(), "expert", Now);

        Assert.Equal(
            "CAPACITY_INVALID",
            Errors.CodeOf(() => profile.SetAvailability(true, capacity, Now))
        );
    }
}
