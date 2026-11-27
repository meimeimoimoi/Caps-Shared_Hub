using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Policies;

namespace Caps.Expert.Application.Features.Policies;

/// <summary>
/// Emails every expert whose price a narrower range has just pushed outside it: their service leaves the
/// marketplace at once, so they must not find out from missing bookings.
/// </summary>
public static class PriceRangeNotices
{
    public static async Task EnqueueAsync(
        IServiceOfferingRepository offerings,
        IExpertNotificationOutbox outbox,
        IReadOnlyDictionary<string, int> before,
        IReadOnlyDictionary<string, int> after,
        string reason,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var oldMin = before[PolicySettingKeys.PricingMinFee];
        var oldMax = before[PolicySettingKeys.PricingMaxFee];
        var newMin = after[PolicySettingKeys.PricingMinFee];
        var newMax = after[PolicySettingKeys.PricingMaxFee];
        // A range that only widened leaves nobody out
        if (newMin <= oldMin && newMax >= oldMax)
            return;
        foreach (
            var (offering, expert, serviceName) in await offerings.ListPricedOutsideAsync(
                newMin,
                newMax,
                ct
            )
        )
        {
            // Already outside the old range: this change does not hide them
            if (offering.Fee < oldMin || offering.Fee > oldMax)
                continue;
            outbox.Enqueue(
                new ExpertPriceOutOfRangeEvent(
                    Guid.NewGuid(),
                    expert.UserId,
                    expert.ContactEmail!,
                    expert.DisplayName ?? expert.ContactEmail!,
                    offering.ServiceCode,
                    serviceName,
                    offering.Fee,
                    newMin,
                    newMax,
                    reason,
                    now
                ),
                now
            );
        }
    }
}
