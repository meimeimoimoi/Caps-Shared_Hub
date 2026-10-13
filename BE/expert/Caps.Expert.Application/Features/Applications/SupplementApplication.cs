using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Applications;

/// <summary>The extra information a reviewer asked for: an explanation and/or files uploaded beforehand.</summary>
public sealed record SupplementApplicationCommand(Applicant Applicant, string? Note);

public sealed class SupplementApplicationHandler(
    IApplicantLock locks,
    IApplicationLoader loader,
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IApplicationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
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
        if (!applicant.EmailVerified)
            throw ExpertErrors.EmailNotVerified();
        var note = string.IsNullOrWhiteSpace(command.Note) ? null : command.Note.Trim();
        var addedFiles = await evidences.AnyAddedAfterAsync(
            application.Id,
            application.SubmittedAt,
            ct
        );
        if (note == null && !addedFiles)
            throw ExpertErrors.SupplementEmpty();

        var now = clock.GetUtcNow();
        applications.AddEvent(application.Resubmit(applicant.UserId, note, now));
        profile.MirrorStatus(application.Status, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await describer.DescribeAsync(applicant, profile, application, ct);
    }
}
