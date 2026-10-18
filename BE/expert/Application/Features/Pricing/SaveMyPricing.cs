using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Pricing;

/// <summary>Saves the expert's draft price for one service and optionally submits it.</summary>
/// <param name="Revision">The workspace revision the expert edited; a stale value is refused.</param>
public sealed record SaveMyPricingCommand(
    Applicant Applicant,
    string ServiceCode,
    long Amount,
    DateOnly EffectiveFrom,
    string? Reason,
    int Revision,
    bool Submit
);

/// <summary>
/// Creates or updates the undecided version, then on submit applies the auto-approval rule (BR-E17).
/// Runs under the expert's lock, so two tabs cannot open two drafts.
/// </summary>
public sealed class SaveMyPricingHandler(
    IApplicantLock locks,
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IPricingRepository pricing,
    IPricingDescriber describer,
    ExpertPolicyOptions policy,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SaveMyPricingCommand, PricingWorkspaceResponse>
{
    public async Task<PricingWorkspaceResponse> HandleAsync(
        SaveMyPricingCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var profile =
            await profiles.FindByUserAsync(applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var latest =
            await qualifications.FindLatestAsync(
                profile.Id,
                command.ServiceCode.Trim().ToUpperInvariant(),
                ct
            ) ?? throw ExpertErrors.QualificationNotFound();
        var qualification =
            await qualifications.FindWithProfileAsync(latest.Id, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        // Prices only change while the service is approved (BR-E15); a suspended service keeps its price
        if (qualification.Status != QualificationStatus.ApprovedForService)
            throw ExpertErrors.PricingNotAllowed(qualification.Status);
        if (await pricing.CountEventsAsync(qualification.Id, ct) != command.Revision)
            throw ExpertErrors.PricingRevisionConflict();

        var now = clock.GetUtcNow();
        var rules = policy.Pricing;
        var version = await pricing.FindOpenAsync(qualification.Id, ct);
        if (version?.Status == PricingStatus.PendingApproval)
            throw ExpertErrors.PricingPendingApproval();
        if (version == null)
        {
            var sequence = await pricing.MaxSequenceAsync(qualification.Id, ct) + 1;
            version = ServicePricingVersion.CreateDraft(qualification, sequence, now);
            pricing.Add(version);
        }
        var events = new List<PricingEvent>
        {
            version.Save(
                applicant.UserId,
                command.Amount,
                command.EffectiveFrom,
                command.Reason,
                rules,
                now
            ),
        };
        if (command.Submit)
        {
            var current = await pricing.FindLatestApprovedAsync(qualification.Id, ct);
            events.AddRange(version.Submit(applicant.UserId, current, rules, now));
        }
        pricing.AddEvents(events);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await describer.DescribeAsync(qualification, ct);
    }
}
