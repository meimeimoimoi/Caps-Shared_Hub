using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Pricing;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The price and delivery time an expert asks for one service.</summary>
public sealed record SetMyServiceCommand(
    Guid UserId,
    string ServiceCode,
    long Fee,
    int TurnaroundHours
);

/// <summary>Creates or reprices the expert's offering for a service they passed Gate 2 for.</summary>
public sealed class SetMyServiceHandler(
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
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
        // Catalog codes are upper case (HUMAN_VERIFICATION)
        var code = command.ServiceCode.Trim().ToUpperInvariant();
        var profile =
            await profiles.FindByUserAsync(command.UserId, ct)
            ?? throw ExpertErrors.PricingNotAllowed("NOT_REGISTERED");
        var qualification = await qualifications.FindLatestAsync(profile.Id, code, ct);
        // A service is open for pricing once the System Admin has set its platform fee
        var rate = await fees.FindCurrentAsync(code, ct) ?? throw ExpertErrors.PlatformFeeNotSet();

        var offering = await offerings.FindAsync(profile.Id, code, ct);
        if (offering == null)
        {
            offering = ServiceOffering.Create(
                qualification,
                rate,
                command.Fee,
                command.TurnaroundHours,
                now
            );
            offerings.Add(offering);
        }
        else
        {
            offering.Reprice(qualification, command.Fee, command.TurnaroundHours, now);
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
            offering.ServiceCode,
            offering.Fee,
            offering.TurnaroundHours,
            rate.Percent,
            rate.NetOf(offering.Fee)
        );
    }
}
