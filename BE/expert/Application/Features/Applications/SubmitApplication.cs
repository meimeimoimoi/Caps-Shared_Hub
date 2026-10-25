using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Submits the applicant's draft for review with the statements agreed to.</summary>
/// <param name="DeclarationCodes">Codes of the statements ticked; the stored wording always comes from the server.</param>
/// <param name="Language">Language the statements were shown in (vi or en).</param>
public sealed record SubmitApplicationCommand(
    Applicant Applicant,
    string[]? DeclarationCodes = null,
    string? Language = null
);

/// <summary>Submits a complete draft from a verified account and locks it.</summary>
public sealed class SubmitApplicationHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IReapplicationChecker reapplication,
    IApplicationDescriber describer,
    ExpertPolicyOptions policy,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SubmitApplicationCommand, ExpertApplicationResponse>
{
    public async Task<ExpertApplicationResponse> HandleAsync(
        SubmitApplicationCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var (profile, application) = await loader.GetCurrentAsync(applicant.UserId, ct);
        application.EnsureEditable();
        applicant.EnsureVerified();
        var submission = policy.Submission;
        var files = await evidences.ListAsync(application.Id, ct);
        var evidenceCodes = files.Select(x => x.EvidenceType).Distinct().ToArray();
        var missing = profile.MissingRequirements(evidenceCodes, submission);
        if (missing.Length > 0)
            throw ExpertErrors.ApplicationIncomplete(missing);
        // After NOT_ELIGIBLE, waiting is not enough: each failed criterion needs a change (POL-EXP-REAPP)
        var unchanged = await reapplication.MissingChangesAsync(
            application,
            profile,
            evidenceCodes,
            ct
        );
        if (unchanged.Length > 0)
            throw ExpertErrors.MaterialChangeRequired(unchanged);
        var declarations = submission.Resolve(command.DeclarationCodes, command.Language);

        var now = clock.GetUtcNow();
        var snapshot = ProfileSnapshot.Of(profile, applicant.Email, declarations);
        applications.AddEvent(application.Submit(applicant.UserId, now, snapshot));
        profile.RecordContactEmail(applicant.Email);
        profile.RecordAccountStatus(applicant.AccountStatus);
        profile.MirrorStatus(application.Status, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Applications,
            [applicant.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(applicant, profile, application, ct);
    }
}
