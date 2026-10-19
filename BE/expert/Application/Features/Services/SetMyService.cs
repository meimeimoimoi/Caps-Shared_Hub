using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The price and delivery time an expert asks for one service.</summary>
public sealed record SetMyServiceCommand(
    Guid UserId,
    string ServiceType,
    long Fee,
    int TurnaroundHours
);

/// <summary>Creates or reprices the expert's package for a service the administrator opened.</summary>
public sealed class SetMyServiceHandler(
    IExpertProfileRepository profiles,
    IPlatformFeeRepository fees,
    IServiceOfferingRepository offerings,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetMyServiceCommand, MyServiceResponse>
{
    public async Task<MyServiceResponse> HandleAsync(
        SetMyServiceCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var profile = await profiles.GetApprovedAsync(command.UserId, ct);
        var type = PlatformFee.NormalizeServiceType(command.ServiceType);
        // A service is open for pricing only once the administrator has set its platform fee
        var rate =
            await fees.FindCurrentAsync(type, now, ct) ?? throw ExpertErrors.ServiceTypeUnknown();

        var offering = await offerings.FindActiveAsync(profile.Id, type, ct);
        if (offering == null)
        {
            offering = ServiceOffering.Create(
                profile.Id,
                rate,
                command.Fee,
                command.TurnaroundHours,
                now
            );
            offerings.Add(offering);
        }
        else
        {
            offering.Reprice(command.Fee, command.TurnaroundHours);
        }
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Two first saves of the same service at once: the unique index let only one through
            throw ExpertErrors.OfferingConflict();
        }

        return new(
            offering.Id,
            offering.ServiceType,
            offering.Fee,
            offering.TurnaroundHours,
            rate.Percent,
            rate.NetOf(offering.Fee)
        );
    }
}
