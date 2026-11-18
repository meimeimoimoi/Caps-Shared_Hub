using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.CreditPackages;

/// <summary>Changes a credit package; payments already started keep the price they were created with.</summary>
public sealed record UpdateCreditPackageCommand(Guid Id, CreditPackageDetails Details);

/// <summary>The entity validates the details; an unknown id is CREDIT_PACKAGE_NOT_FOUND.</summary>
public sealed class UpdateCreditPackageHandler(
    ICreditPackageRepository packages,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateCreditPackageCommand, CreditPackageResponse>
{
    public async Task<CreditPackageResponse> HandleAsync(
        UpdateCreditPackageCommand command,
        CancellationToken ct
    )
    {
        var package =
            await packages.FindAsync(command.Id, ct) ?? throw BillingErrors.CreditPackageNotFound();
        package.Update(command.Details, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        return CreditPackageResponse.From(package);
    }
}
