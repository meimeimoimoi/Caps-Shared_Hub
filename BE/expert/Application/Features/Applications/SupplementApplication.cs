using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>
/// The extra information a reviewer asked for: an explanation, files uploaded beforehand and/or changed
/// details, with the statements agreed to again for this submission.
/// </summary>
public sealed record SupplementApplicationCommand(
    Applicant Applicant,
    string? Note,
    string[]? DeclarationCodes = null,
    string? Language = null
);

/// <summary>Resubmits after more information was requested, once something new was provided.</summary>
public sealed class SupplementApplicationHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IApplicationDescriber describer,
    ExpertPolicyOptions policy,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SupplementApplicationCommand, ExpertApplicationResponse>
{
    public async Task<ExpertApplicationResponse> HandleAsync(
        SupplementApplicationCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var (profile, application) = await loader.GetCurrentAsync(applicant.UserId, ct);
        if (!application.NeedsInformation)
            throw ExpertErrors.ApplicationLocked(application.Status);
        applicant.EnsureVerified();
        var note = string.IsNullOrWhiteSpace(command.Note) ? null : command.Note.Trim();
        var addedFiles = await evidences.AnyAddedAfterAsync(
            application.Id,
            application.SubmittedAt,
            ct
        );
        // Changed details count as new information too (edited in the form or in the expert settings)
        var history = await applications.ListEventsAsync(application.Id, ct);
        var detailsChanged =
            ExpertApplicationEvent.LatestSnapshot(history) is not { } previous
            || !previous.HasSameDetails(profile);
        if (note == null && !addedFiles && !detailsChanged)
            throw ExpertErrors.SupplementEmpty();

        var submission = policy.Submission;
        var files = await evidences.ListAsync(application.Id, ct);
        var missing = profile.MissingRequirements(
            files.Select(x => x.EvidenceType).Distinct().ToArray(),
            submission
        );
        if (missing.Length > 0)
            throw ExpertErrors.ApplicationIncomplete(missing);
        var declarations = submission.Resolve(command.DeclarationCodes, command.Language);

        var now = clock.GetUtcNow();
        var snapshot = ProfileSnapshot.Of(profile, applicant.Email, declarations);
        applications.AddEvent(application.Resubmit(applicant.UserId, note, now, snapshot));
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
