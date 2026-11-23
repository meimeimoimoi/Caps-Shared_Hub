using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>Sets the competencies one of the expert's competency files supports.</summary>
public sealed record SetEvidenceCompetenciesCommand(
    Applicant Applicant,
    Guid QualificationId,
    Guid EvidenceId,
    IReadOnlyList<string>? Competencies
);

/// <summary>
/// Replaces the file's competencies while evidence is accepted; a file already submitted can gain
/// competencies but keeps those it was reviewed under.
/// </summary>
public sealed class SetEvidenceCompetenciesHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository qualificationEvidence,
    ICompetencyEvidenceRepository competencyEvidence,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SetEvidenceCompetenciesCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        SetEvidenceCompetenciesCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        var codes = CompetencyEvidenceRules.CleanCodes(command.Competencies);
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var qualification =
            await qualifications.FindOwnedAsync(command.QualificationId, applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var evidence =
            await qualificationEvidence.FindAsync(command.EvidenceId, qualification, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        var current = await competencyEvidence.ListLinksForEvidenceAsync(evidence.Id, ct);
        var currentCodes = current.Select(x => x.Competency).ToArray();
        qualification.EnsureCanTie(evidence, currentCodes, codes);
        var now = clock.GetUtcNow();
        competencyEvidence.RemoveLinks(current.Where(x => !codes.Contains(x.Competency)));
        competencyEvidence.AddLinks(
            codes
                .Except(currentCodes)
                .Select(code =>
                    CompetencyEvidenceLink.Create(qualification.Id, evidence.Id, code, now)
                )
        );
        qualification.Touch(now);
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
