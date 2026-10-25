using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Adds a public link as competency evidence, tied to one or more competencies.</summary>
public sealed record AddQualificationEvidenceLinkCommand(
    Applicant Applicant,
    Guid QualificationId,
    string? SourceUrl,
    IReadOnlyList<string>? Competencies
);

/// <summary>
/// Records the link under the same lock, status rules and limit as file uploads. Reviewers open it directly;
/// it is never downloaded or extracted (I3).
/// </summary>
public sealed class AddQualificationEvidenceLinkHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository qualificationEvidence,
    IExpertEvidenceRepository evidences,
    ICompetencyEvidenceRepository competencyEvidence,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<AddQualificationEvidenceLinkCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        AddQualificationEvidenceLinkCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        applicant.EnsureVerified();
        var codes = CompetencyEvidenceRules.CleanCodes(command.Competencies);
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
        var evidence = ExpertEvidence.CreateLinkForQualification(
            qualification,
            command.SourceUrl ?? "",
            now
        );
        evidences.Add(evidence);
        competencyEvidence.AddLinks(
            codes.Select(code =>
                CompetencyEvidenceLink.Create(qualification.Id, evidence.Id, code, now)
            )
        );
        qualification.Touch(now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // Reviewers see new or removed evidence without reloading
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [applicant.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
