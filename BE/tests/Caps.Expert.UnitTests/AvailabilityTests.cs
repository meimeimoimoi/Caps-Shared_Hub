using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.UnitTests;

public sealed class AvailabilityTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);

    private static ExpertProfile NewProfile() =>
        ExpertProfile.Create(Guid.NewGuid(), "expert", Now);

    // A profile that has promised a delivery time, so only its offerings decide readiness
    private static ExpertProfile Ready()
    {
        var profile = NewProfile();
        profile.SetTurnaroundHours(48, Now);
        return profile;
    }

    [Fact]
    public void Accepting_with_an_offering_and_a_turnaround_turns_the_service_on()
    {
        var profile = Ready();

        profile.SetAvailability(accepting: true, capacity: 3, activeOfferings: 1, Now);

        Assert.Equal(ExpertServiceStatus.Active, profile.ServiceStatus);
        Assert.Equal(3, profile.Capacity);
    }

    [Fact]
    public void Accepting_without_an_offering_is_rejected()
    {
        var profile = Ready();

        Assert.Equal(
            "NOT_READY_TO_ACCEPT",
            Errors.CodeOf(() => profile.SetAvailability(true, 3, activeOfferings: 0, Now))
        );
    }

    [Fact]
    public void Accepting_without_a_turnaround_is_rejected()
    {
        var profile = NewProfile();

        Assert.Equal(
            "NOT_READY_TO_ACCEPT",
            Errors.CodeOf(() => profile.SetAvailability(true, 3, activeOfferings: 1, Now))
        );
    }

    [Fact]
    public void Pausing_is_allowed_before_the_expert_is_ready_and_keeps_the_capacity()
    {
        var profile = NewProfile();

        profile.SetAvailability(accepting: false, capacity: 5, activeOfferings: 0, Now);

        Assert.Equal(ExpertServiceStatus.Inactive, profile.ServiceStatus);
        Assert.Equal(5, profile.Capacity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(ExpertProfile.MaxCapacity + 1)]
    public void Capacity_outside_the_allowed_range_is_rejected(int capacity)
    {
        var profile = Ready();

        Assert.Equal(
            "CAPACITY_INVALID",
            Errors.CodeOf(() => profile.SetAvailability(true, capacity, activeOfferings: 1, Now))
        );
    }

    [Fact]
    public void Turnaround_inside_the_range_is_kept()
    {
        var profile = NewProfile();

        profile.SetTurnaroundHours(48, Now);

        Assert.Equal(48, profile.TurnaroundHours);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(ExpertProfile.MaxTurnaroundHours + 1)]
    public void Turnaround_outside_the_range_is_rejected(int hours)
    {
        var profile = NewProfile();

        Assert.Equal(
            "TURNAROUND_INVALID",
            Errors.CodeOf(() => profile.SetTurnaroundHours(hours, Now))
        );
    }
}
