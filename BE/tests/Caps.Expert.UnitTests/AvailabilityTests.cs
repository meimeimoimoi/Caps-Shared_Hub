using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Portal;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.UnitTests;

public sealed class AvailabilityTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Profile = Guid.NewGuid();

    private static AvailabilitySlot Slot(
        int startHours,
        int lengthHours,
        params AvailabilitySlot[] open
    ) =>
        AvailabilitySlot.Add(
            Profile,
            Now.AddHours(startHours),
            Now.AddHours(startHours + lengthHours),
            open,
            Now
        );

    private static ListingFacts Listed() =>
        new(QualificationStatus.ApprovedForService, true, true, true, true, true);

    [Fact]
    public void A_future_slot_of_one_to_twelve_hours_opens()
    {
        var slot = Slot(2, 3);

        Assert.True(slot.IsOpen);
        Assert.Equal(Now.AddHours(2), slot.StartAt);
        Assert.Equal(Now.AddHours(5), slot.EndAt);
    }

    [Fact]
    public void Slots_in_the_past_too_far_ahead_or_of_a_wrong_length_are_refused()
    {
        Assert.Equal("SLOT_IN_PAST", Errors.CodeOf(() => Slot(-1, 2)));
        Assert.Equal("SLOT_TOO_FAR_AHEAD", Errors.CodeOf(() => Slot(24 * 91, 2)));
        Assert.Equal("SLOT_LENGTH_INVALID", Errors.CodeOf(() => Slot(2, 0)));
        Assert.Equal("SLOT_LENGTH_INVALID", Errors.CodeOf(() => Slot(2, 13)));
    }

    [Fact]
    public void Overlapping_slots_are_refused_but_adjacent_ones_are_not()
    {
        var first = Slot(2, 3);

        Assert.Equal("SLOT_OVERLAP", Errors.CodeOf(() => Slot(4, 2, first)));
        var adjacent = Slot(5, 2, first);
        Assert.Equal(first.EndAt, adjacent.StartAt);
    }

    [Fact]
    public void At_most_fifty_slots_can_be_open()
    {
        var open = Enumerable
            .Range(0, AvailabilityRules.MaxOpenSlots)
            .Select(i => Slot(2 + (i * 2), 1))
            .ToArray();

        Assert.Equal("SLOT_LIMIT", Errors.CodeOf(() => Slot(500, 1, open)));
    }

    [Fact]
    public void A_service_is_listed_only_when_every_condition_holds()
    {
        Assert.True(MarketplaceRules.IsListed(Listed()));
        Assert.False(MarketplaceRules.IsListed(Listed() with { AccountActive = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { ServiceActive = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { PriceInEffect = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { AcceptingRequests = false }));
        Assert.False(MarketplaceRules.IsListed(Listed() with { HasOpenSlot = false }));
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
                }
            )
        );
        Assert.Equal(
            ["REQUESTS_TURNED_OFF"],
            MarketplaceRules.Missing(Listed() with { AcceptingRequests = false })
        );
        Assert.Equal(
            ["NO_OPEN_SLOTS"],
            MarketplaceRules.Missing(Listed() with { HasOpenSlot = false })
        );
        Assert.Empty(MarketplaceRules.Missing(Listed()));
    }

    [Fact]
    public void Only_active_accounts_count_as_active()
    {
        var profile = ExpertProfile.Create(Guid.NewGuid(), "A", Now);
        Assert.False(profile.IsAccountActive);

        profile.RecordAccountStatus("ACTIVE");
        Assert.True(profile.IsAccountActive);
        profile.RecordAccountStatus(" ");
        Assert.True(profile.IsAccountActive);
    }

    [Fact]
    public void Slots_sent_with_a_local_offset_are_stored_in_utc()
    {
        var vietnam = TimeSpan.FromHours(7);
        var start = new DateTimeOffset(2026, 10, 19, 9, 0, 0, vietnam);

        var slot = AvailabilitySlot.Add(Profile, start, start.AddHours(3), [], Now);

        Assert.Equal(TimeSpan.Zero, slot.StartAt.Offset);
        Assert.Equal(start, slot.StartAt);
    }
}
