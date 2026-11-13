using Caps.Expert.Domain.Portal;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.UnitTests;

public sealed class AvailabilityTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 27, 1, 0, 0, TimeSpan.Zero);

    private static ExpertProfile Profile() => ExpertProfile.Create(Guid.NewGuid(), "A", Now);

    // ActiveCases is written by the case flow through the database only; tests set it the same way EF does
    private static ExpertProfile WithActiveCases(ExpertProfile profile, int count)
    {
        typeof(ExpertProfile)
            .GetField(
                "<ActiveCases>k__BackingField",
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic
            )!
            .SetValue(profile, count);
        return profile;
    }

    private static ListingFacts Listed() =>
        new(QualificationStatus.ApprovedForService, true, true, true, true, true);

    [Fact]
    public void A_new_profile_has_no_capacity_and_no_free_slot()
    {
        var profile = Profile();

        Assert.Equal((0, 0, 0), (profile.Capacity, profile.ActiveCases, profile.FreeSlots));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    [InlineData(20)]
    public void Capacity_from_one_to_twenty_is_kept(int capacity)
    {
        var profile = Profile();

        profile.SetCapacity(capacity, Now.AddHours(1));

        Assert.Equal((capacity, capacity), (profile.Capacity, profile.FreeSlots));
        Assert.Equal(Now.AddHours(1), profile.UpdatedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(21)]
    public void Capacity_outside_one_to_twenty_is_refused_and_nothing_changes(int capacity)
    {
        var profile = Profile();
        profile.SetCapacity(3, Now);

        Assert.Equal(
            "CAPACITY_INVALID",
            Errors.CodeOf(() => profile.SetCapacity(capacity, Now.AddHours(1)))
        );
        Assert.Equal((3, Now), (profile.Capacity, profile.UpdatedAt));
    }

    [Fact]
    public void Free_slots_count_down_with_accepted_cases_and_never_go_negative()
    {
        var profile = WithActiveCases(Profile(), 2);
        profile.SetCapacity(5, Now);
        Assert.Equal(3, profile.FreeSlots);

        // Lowering below the running cases is allowed: they keep running, nothing new fits
        profile.SetCapacity(1, Now);
        Assert.Equal((1, 2, 0), (profile.Capacity, profile.ActiveCases, profile.FreeSlots));
    }

    [Fact]
    public void A_service_is_listed_only_when_every_condition_holds()
    {
        Assert.True(MarketplaceRules.IsListed(Listed()));
        Assert.False(MarketplaceRules.IsListed(Listed() with { AccountActive = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { ServiceActive = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { PriceInEffect = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { AcceptingRequests = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { CapacitySet = false }));
        Assert.False(
            MarketplaceRules.IsListed(
                Listed() with
                {
                    QualificationStatus = QualificationStatus.Suspended,
                }
            )
        );
    }

    [Fact]
    public void The_missing_step_is_reported_in_the_order_the_expert_fixes_it()
    {
        Assert.Equal(
            ["PRICING_PENDING"],
            MarketplaceRules.Missing(
                Listed() with
                {
                    PriceInEffect = false,
                    AcceptingRequests = false,
                    CapacitySet = false,
                }
            )
        );
        Assert.Equal(
            ["REQUESTS_TURNED_OFF"],
            MarketplaceRules.Missing(
                Listed() with
                {
                    AcceptingRequests = false,
                    CapacitySet = false,
                }
            )
        );
        Assert.Equal(
            ["CAPACITY_NOT_SET"],
            MarketplaceRules.Missing(Listed() with { CapacitySet = false })
        );
        Assert.Empty(MarketplaceRules.Missing(Listed()));
    }

    [Fact]
    public void Only_active_accounts_count_as_active()
    {
        var profile = Profile();
        Assert.False(profile.IsAccountActive);

        profile.RecordAccountStatus("ACTIVE");
        Assert.True(profile.IsAccountActive);
        profile.RecordAccountStatus(" ");
        Assert.True(profile.IsAccountActive);
    }
}
