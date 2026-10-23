using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>The extra evidence a reviewer asked for: an explanation and/or files uploaded beforehand.</summary>
public sealed record SupplementQualificationCommand(
    Applicant Applicant,
    Guid QualificationId,
    string? Note
);

/// <summary>Sends the qualification back to competency review once something new was added.</summary>
public sealed class SupplementQualificationHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository evidences,
    ICompetencyEvidenceRepository competencyEvidence,
    ICompetencyAssessmentRepository assessments,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SupplementQualificationCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        SupplementQualificationCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var qualification =
            await qualifications.FindOwnedAsync(command.QualificationId, applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        if (!qualification.NeedsInformation)
            throw ExpertErrors.QualificationLocked(qualification.Status);
        if (!applicant.EmailVerified)
            throw ExpertErrors.EmailNotVerified();
        var note = string.IsNullOrWhiteSpace(command.Note) ? null : command.Note.Trim();
        var addedFiles = await evidences.AnyAddedAfterAsync(
            qualification.Id,
            qualification.SubmittedAt,
            ct
        );
        // A re-registration after FAIL is only reviewed again with new competency evidence (BR-E22)
        if (qualification.AwaitsNewEvidence && !addedFiles)
            throw ExpertErrors.NewEvidenceRequired();
        // E7: each competency that failed needs a new file tied to it ("related to the failed competency")
        if (
            qualification.AwaitsNewEvidence
            && qualification.PreviousQualificationId is Guid previous
        )
        {
            var failed = (await assessments.ListLatestAsync(previous, ct))
                .Where(x => x.Result == CompetencyCriteria.Fail)
                .Select(x => x.Competency);
            var links = await competencyEvidence.ListLinksAsync(qualification.Id, ct);
            var missing = CompetencyEvidenceRules.MissingNewEvidence(failed, links);
            if (missing.Length > 0)
                throw ExpertErrors.CompetencyNewEvidenceRequired(missing);
        }
        if (note == null && !addedFiles)
            throw ExpertErrors.SupplementEmpty();
        qualifications.AddEvent(qualification.Resubmit(applicant.UserId, note, clock.GetUtcNow()));
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [applicant.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
