using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>The new platform fee a System Admin sets for one catalog service.</summary>
public sealed record SetPlatformFeeCommand(Guid AdminId, string ServiceCode, int Percent);

/// <summary>Adds a new rate effective now; booked cases keep the percent frozen on them.</summary>
public sealed class SetPlatformFeeHandler(
    IServiceCatalogRepository catalog,
    IPlatformFeeRepository fees,
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
        var code = command.ServiceCode.Trim().ToUpperInvariant();
        var service = await catalog.FindAsync(code, ct) ?? throw ExpertErrors.ServiceNotFound();
        var fee = PlatformFee.Set(service, command.Percent, command.AdminId, clock.GetUtcNow());
        fees.Add(fee);
        await unitOfWork.SaveChangesAsync(ct);
        // Other admins on the platform fee page see the new rate at once
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Pricing,
            [],
            [Permission.PricingManage],
            ct
        );
        return new(fee.ServiceCode, service.Name, fee.Percent, fee.EffectiveFrom);
    }
}
