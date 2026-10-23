using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Qualifications;

/// <summary>The expert sends the prepared competency evidence for review.</summary>
public sealed record SubmitQualificationCommand(Applicant Applicant, Guid QualificationId);

/// <summary>PREPARING → COMPETENCY_REVIEW once at least one file is tied to a competency (E5).</summary>
public sealed class SubmitQualificationHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    ICompetencyEvidenceRepository competencyEvidence,
    IQualificationDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<SubmitQualificationCommand, ExpertQualificationResponse>
{
    public async Task<ExpertQualificationResponse> HandleAsync(
        SubmitQualificationCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        applicant.EnsureVerified();
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var qualification =
            await qualifications.FindOwnedAsync(command.QualificationId, applicant.UserId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var links = await competencyEvidence.ListLinksAsync(qualification.Id, ct);
        var tiedFiles = links.Select(x => x.EvidenceId).Distinct().Count();
        qualifications.AddEvent(
            qualification.Submit(applicant.UserId, tiedFiles, clock.GetUtcNow())
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // The qualification joins the Gate 2 queue
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [applicant.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(applicant, qualification, ct);
    }
}
