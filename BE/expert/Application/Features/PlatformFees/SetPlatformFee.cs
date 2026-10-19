using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>The new platform fee an administrator sets for one service.</summary>
public sealed record SetPlatformFeeCommand(Guid AdminId, string ServiceType, int Percent);

/// <summary>Adds a new rate effective now; booked cases keep the percent frozen on them.</summary>
public sealed class SetPlatformHandler(
    IPlatformFeeRepository fees,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetPlatformFeeCommand, PlatformFeeResponse>
{
    public async Task<PlatformFeeResponse> HandleAsync(
        SetPlatformFeeCommand command,
        CancellationToken ct
    )
    {
        var fee = PlatformFee.Set(
            command.ServiceType,
            command.Percent,
            command.AdminId,
            clock.GetUtcNow()
        );
        fees.Add(fee);
        await unitOfWork.SaveChangesAsync(ct);
        return new(fee.ServiceType, fee.Percent, fee.EffectiveFrom);
    }
}
