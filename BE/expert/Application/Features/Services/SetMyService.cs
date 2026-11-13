using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The price and delivery time (whole days, in hours) an expert asks for one service.</summary>
public sealed record SetMyServiceCommand(
    Guid UserId,
    string ServiceCode,
    long Fee,
    int TurnaroundHours
);

/// <summary>
/// Creates or reprices the expert's offering for a service they passed Gate 2 for, within the admin's price and
/// turnaround ranges, and keeps every saved price in the append-only history.
/// </summary>
public sealed class SetMyServiceHandler(
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IPlatformFeeRepository fees,
    IServiceOfferingRepository offerings,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SetMyServiceCommand, MyServiceResponse>
{
    public async Task<MyServiceResponse> HandleAsync(
        SetMyServiceCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        // Catalog codes are upper case (HUMAN_VERIFICATION)
        var code = command.ServiceCode.Trim().ToUpperInvariant();
        var profile =
            await profiles.FindByUserAsync(command.UserId, ct)
            ?? throw ExpertErrors.PricingNotAllowed("NOT_REGISTERED");
        var qualification = await qualifications.FindLatestAsync(profile.Id, code, ct);
        // A service is open for pricing once the System Admin has set its platform fee
        var rate =
            await fees.FindCurrentAsync(code, now, ct) ?? throw ExpertErrors.PlatformFeeNotSet();
        var policy = await policies.GetPricingAsync(ct);
        var offering = await offerings.FindAsync(profile.Id, code, ct);
        ServiceOfferingChange? change;
        if (offering == null)
        {
            (offering, change) = ServiceOffering.Create(
                qualification,
                rate,
                command.Fee,
                command.TurnaroundHours,
                policy,
                command.UserId,
                now
            );
            offerings.Add(offering);
        }
        else
        {
            change = offering.Reprice(
                qualification,
                command.Fee,
                command.TurnaroundHours,
                policy,
                command.UserId,
                now
            );
        }
        if (change != null)
            offerings.AddChange(change);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Two first saves of the same service at once: the unique index let only one through
            throw ExpertErrors.OfferingConflict();
        }
        // The expert's other open tabs refresh the price and readiness at once
        await realtime.ChangedAsync(ExpertRealtimeTopics.Pricing, [command.UserId], [], ct);
        var pending = (await fees.ListAllPendingAsync(now, ct))
            .Where(p => p.ServiceCode == code)
            .MaxBy(p => p.EffectiveFrom);
        return new(
            offering.ServiceCode,
            offering.Fee,
            offering.TurnaroundHours,
            rate.Percent,
            rate.NetOf(offering.Fee),
            pending == null
                ? null
                : new(
                    pending.Percent,
                    PlatformFeeRows.LateOf(pending),
                    PlatformFeeRows.NoResponseOf(pending),
                    pending.EffectiveFrom
                ),
            PlatformFeeRows.Limits(policy)
        );
    }
}
