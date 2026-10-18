using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>Submits the applicant's draft for review.</summary>
public sealed record SubmitApplicationCommand(Applicant Applicant);

/// <summary>Submits a complete draft from a verified account and locks it.</summary>
public sealed class SubmitApplicationHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
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
        if (!applicant.EmailVerified)
            throw ExpertErrors.EmailNotVerified();
        var hasCv = await evidences.HasCodeAsync(application.Id, ApplicationRules.CvCode, ct);
        var missing = profile.MissingRequirements(hasCv);
        if (missing.Length > 0)
            throw ExpertErrors.ApplicationIncomplete(missing);

        var now = clock.GetUtcNow();
        applications.AddEvent(application.Submit(applicant.UserId, now));
        profile.RecordContactEmail(applicant.Email);
        profile.RecordAccountStatus(applicant.AccountStatus);
        profile.MirrorStatus(application.Status, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await describer.DescribeAsync(applicant, profile, application, ct);
    }
}
