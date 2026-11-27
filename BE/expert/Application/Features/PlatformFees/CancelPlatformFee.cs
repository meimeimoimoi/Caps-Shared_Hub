using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>The System Admin withdrawing the pending platform fee change of one catalog service.</summary>
public sealed record CancelPlatformFeeCommand(Guid AdminId, string ServiceCode);

/// <summary>
/// Cancels the announced change before its effective day; the rate in force stays and the cancelled row is
/// kept as history. Refused with PLATFORM_FEE_NOT_PENDING when there is nothing left to cancel.
/// </summary>
public sealed class CancelPlatformFeeHandler(
    IServiceCatalogRepository catalog,
    IPlatformFeeRepository fees,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime,
    IServiceOfferingRepository offerings,
    IExpertNotificationOutbox outbox
) : ICommandHandler<CancelPlatformFeeCommand, PlatformFeeResponse>
{
    public async Task<PlatformFeeResponse> HandleAsync(
        CancelPlatformFeeCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var code = command.ServiceCode.Trim().ToUpperInvariant();
        var service = await catalog.FindAsync(code, ct) ?? throw ExpertErrors.ServiceNotFound();
        var pending = await fees.ListPendingAsync(code, now, ct);
        if (pending.Count == 0)
            throw ExpertErrors.PlatformFeeNotPending();
        foreach (var fee in pending)
            fee.Cancel(command.AdminId, now);
        var current = await fees.FindCurrentAsync(code, now, ct);
        // Experts warned of the change learn it is off and their payout stays as it is
        if (current != null)
        {
            await PlatformFeeNotices.EnqueueAsync(
                offerings,
                outbox,
                service,
                current,
                pending[0],
                true,
                now,
                ct
            );
        }
        await unitOfWork.SaveChangesAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Pricing,
            [],
            [Permission.PricingManage],
            ct
        );
        var policy = await policies.GetPricingAsync(ct);
        return PlatformFeeRows.Build(service, current, null, policy, now);
    }
}
