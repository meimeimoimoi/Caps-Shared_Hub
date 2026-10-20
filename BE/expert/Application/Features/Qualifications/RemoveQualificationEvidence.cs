using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Removes a file the expert added to a qualification.</summary>
public sealed record RemoveQualificationEvidenceCommand(
    Applicant Applicant,
    Guid QualificationId,
    Guid EvidenceId
);

/// <summary>Removes a file not yet part of a submission, then deletes it from storage.</summary>
public sealed class RemoveQualificationEvidenceHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository qualificationEvidence,
    IExpertEvidenceRepository evidences,
    IObjectStorage storage,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RemoveQualificationEvidenceCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        RemoveQualificationEvidenceCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var qualification =
            await qualifications.FindOwnedAsync(command.QualificationId, applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var evidence =
            await qualificationEvidence.FindAsync(command.EvidenceId, qualification, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        if (!qualification.CanRemove(evidence))
            throw ExpertErrors.EvidenceLocked();
        evidences.Remove(evidence);
        qualification.Touch(clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // Delete the file only once the row is gone, so a failure never leaves a row without its file
        await storage.DeleteQuietlyAsync(evidence.FileUrl);
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
