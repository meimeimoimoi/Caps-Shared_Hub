using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.CreditPackages;

/// <summary>Adds a credit package.</summary>
public sealed record CreateCreditPackageCommand(CreditPackageDetails Details);

/// <summary>The entity validates the details.</summary>
public sealed class CreateCreditPackageHandler(
    ICreditPackageRepository packages,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<CreateCreditPackageCommand, CreditPackageResponse>
{
    public async Task<CreditPackageResponse> HandleAsync(
        CreateCreditPackageCommand command,
        CancellationToken ct
    )
    {
        var package = CreditPackage.Create(command.Details, clock.GetUtcNow());
        packages.Add(package);
        await unitOfWork.SaveChangesAsync(ct);
        return CreditPackageResponse.From(package);
    }
}
