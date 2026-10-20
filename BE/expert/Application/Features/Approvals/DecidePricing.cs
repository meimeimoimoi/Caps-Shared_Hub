using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Approvals;

/// <summary>A System Admin's decision on a price change above the threshold.</summary>
public sealed record DecidePricingCommand(
    Guid AdminUserId,
    Guid VersionId,
    string Decision,
    string? Note
);

/// <summary>Records the decision under the expert's lock; approving supersedes the previous price (BR-E18).</summary>
public sealed class DecidePricingHandler(
    IApplicantLock locks,
    IPricingRepository pricing,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<DecidePricingCommand, ServicePricingResponse>
{
    public async Task<ServicePricingResponse> HandleAsync(
        DecidePricingCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var expertUserId =
            await pricing.FindExpertUserIdAsync(command.VersionId, ct)
            ?? throw ExpertErrors.PricingVersionNotFound();
        await locks.AcquireAsync(expertUserId, ct);
        var version =
            await pricing.FindAsync(command.VersionId, ct)
            ?? throw ExpertErrors.PricingVersionNotFound();
        var current = await pricing.FindLatestApprovedAsync(version.QualificationId, ct);
        var events = version.Decide(
            command.AdminUserId,
            command.Decision.Trim().ToUpperInvariant(),
            command.Note,
            current,
            clock.GetUtcNow()
        );
        pricing.AddEvents(events);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Common.PricingDescriber.ToResponse(version);
    }
}
