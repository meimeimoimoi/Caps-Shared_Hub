using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>The expert's short explanation of what the files show for one competency; empty clears it.</summary>
public sealed record SaveCompetencyDescriptionCommand(
    Applicant Applicant,
    Guid QualificationId,
    string Competency,
    string? Text
);

/// <summary>Saves the description while evidence is accepted (E4).</summary>
public sealed class SaveCompetencyDescriptionHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    ICompetencyEvidenceRepository competencyEvidence,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SaveCompetencyDescriptionCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        SaveCompetencyDescriptionCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        var code = CompetencyEvidenceRules.CleanCode(command.Competency);
        var text = CompetencyEvidenceRules.CleanDescription(command.Text);
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var qualification =
            await qualifications.FindOwnedAsync(command.QualificationId, applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        if (!qualification.AcceptsEvidence)
            throw ExpertErrors.QualificationLocked(qualification.Status);
        var now = clock.GetUtcNow();
        var existing = await competencyEvidence.FindDescriptionAsync(qualification.Id, code, ct);
        if (existing != null && text == null)
        {
            competencyEvidence.RemoveDescription(existing);
        }
        else if (existing != null)
        {
            existing.Change(text!, now);
        }
        else if (text != null)
        {
            competencyEvidence.AddDescription(
                CompetencyDescription.Create(qualification.Id, code, text, now)
            );
        }
        qualification.Touch(now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
