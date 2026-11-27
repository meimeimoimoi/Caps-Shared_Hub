using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>
/// Tells every expert who priced the service about an announced or withdrawn fee change, with what they keep
/// per case now and after the change, so nobody learns of it from a smaller payout.
/// </summary>
public static class PlatformFeeNotices
{
    public static async Task EnqueueAsync(
        IServiceOfferingRepository offerings,
        IExpertNotificationOutbox outbox,
        ServiceCatalogItem service,
        PlatformFee current,
        PlatformFee change,
        bool cancelled,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        foreach (var (offering, expert) in await offerings.ListByServiceAsync(service.Code, ct))
        {
            outbox.Enqueue(
                new PlatformFeeChangeAnnouncedEvent(
                    Guid.NewGuid(),
                    expert.UserId,
                    expert.ContactEmail!,
                    expert.DisplayName ?? expert.ContactEmail!,
                    service.Code,
                    service.Name,
                    offering.Fee,
                    current.Percent,
                    current.NetOf(offering.Fee),
                    change.Percent,
                    change.NetOf(offering.Fee),
                    change.EffectiveFrom,
                    change.Reason,
                    cancelled,
                    now
                ),
                now
            );
        }
    }
}
