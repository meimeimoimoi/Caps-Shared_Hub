using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>
/// The new platform fee a System Admin sets for one catalog service and the day it takes effect (Vietnam time);
/// EffectiveOn may be left out only for the very first fee of the service.
/// </summary>
public sealed record SetPlatformFeeCommand(
    Guid AdminId,
    string ServiceCode,
    int Percent,
    int LatePenaltyHours,
    int LatePenaltyPercent,
    int LateCancelHours,
    DateOnly? EffectiveOn
);

/// <summary>
/// Announces a new rate at least PlatformFeeNoticeDays ahead (raise or cut alike) and replaces a change still
/// pending, so a service has at most one. The first rate of a service takes effect at once. Booked cases keep
/// the percent frozen on them.
/// </summary>
public sealed class SetPlatformFeeHandler(
    IServiceCatalogRepository catalog,
    IPlatformFeeRepository fees,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SetPlatformFeeCommand, PlatformFeeResponse>
{
    public async Task<PlatformFeeResponse> HandleAsync(
        SetPlatformFeeCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var code = command.ServiceCode.Trim().ToUpperInvariant();
        var service = await catalog.FindAsync(code, ct) ?? throw ExpertErrors.ServiceNotFound();
        var policy = await policies.GetPricingAsync(ct);
        var current = await fees.FindCurrentAsync(code, now, ct);
        var fee = PlatformFee.Set(
            service,
            command.Percent,
            command.LatePenaltyHours,
            command.LatePenaltyPercent,
            command.LateCancelHours,
            command.EffectiveOn,
            current != null,
            policy.FeeNoticeDays,
            command.AdminId,
            now
        );
        // One pending change per service: a new announcement replaces the old one, which stays as history
        foreach (var pending in await fees.ListPendingAsync(code, now, ct))
            pending.Cancel(command.AdminId, now);
        fees.Add(fee);
        await unitOfWork.SaveChangesAsync(ct);
        // Other admins on the platform fee page see the new rate at once
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Pricing,
            [],
            [Permission.PricingManage],
            ct
        );
        return fee.IsPendingAt(now)
            ? PlatformFeeRows.Build(service, current, fee, policy, now)
            : PlatformFeeRows.Build(service, fee, null, policy, now);
    }
}
