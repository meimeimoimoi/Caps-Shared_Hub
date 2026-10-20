using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Uploads one competency evidence file to a qualification waiting for more information.</summary>
public sealed record AddQualificationEvidenceCommand(
    Applicant Applicant,
    Guid QualificationId,
    string FileName,
    byte[] Content
);

/// <summary>Validates an upload by its content, stores it and records it on the qualification.</summary>
public sealed class AddQualificationEvidenceHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository qualificationEvidence,
    IExpertEvidenceRepository evidences,
    IObjectStorage storage,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AddQualificationEvidenceCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        AddQualificationEvidenceCommand command,
        CancellationToken ct
    )
    {
        // Reject a bad file before touching the database
        var contentType = ApplicationRules.ValidateContent(command.Content);
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var qualification =
            await qualifications.FindOwnedAsync(command.QualificationId, applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        qualification.EnsureAcceptsFile();
        if (
            await qualificationEvidence.CountAddedAsync(qualification.Id, ct)
            >= ApplicationRules.MaxFilesPerApplication
        )
        {
            throw ExpertErrors.EvidenceLimit(ApplicationRules.MaxFilesPerApplication);
        }
        var now = clock.GetUtcNow();
        var evidence = ExpertEvidence.CreateForQualification(
            qualification,
            applicant.UserId,
            command.FileName,
            contentType,
            command.Content.Length,
            now
        );
        await storage.PutAsync(evidence.FileUrl, command.Content, contentType, ct);
        evidences.Add(evidence);
        qualification.Touch(now);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            // The row was not saved, so the stored file would never be reachable
            await storage.DeleteQuietlyAsync(evidence.FileUrl);
            throw;
        }
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
