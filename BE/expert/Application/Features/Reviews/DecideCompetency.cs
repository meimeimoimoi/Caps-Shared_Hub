using Caps.Common.Application;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>A reviewer's Gate 2 results for C1…C5 with an optional overall note.</summary>
public sealed record DecideCompetencyCommand(
    Guid ReviewerUserId,
    Guid QualificationId,
    IReadOnlyList<CompetencyResult> Competencies,
    string? Note
);

/// <summary>
/// Records the Gate 2 decision. Runs under the expert's lock, so it cannot interleave with the expert's own
/// changes or with another reviewer deciding the same qualification.
/// </summary>
public sealed class DecideCompetencyHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository evidences,
    ICompetencyAssessmentRepository assessments,
    IServiceCatalogRepository catalog,
    IExpertNotificationOutbox outbox,
    IQualificationReviewDescriber describer,
    ExpertPolicyOptions policy,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<DecideCompetencyCommand, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        DecideCompetencyCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var applicantUserId =
            await qualifications.FindApplicantUserIdAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        await locks.AcquireAsync(applicantUserId, ct);
        // Loaded after the lock so the status check sees the latest committed state
        var qualification =
            await qualifications.FindWithProfileAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        var profile = qualification.ExpertProfile;
        var files = await evidences.ListAsync(qualification, ct);

        var now = clock.GetUtcNow();
        var decision = qualification.DecideCompetency(
            command.ReviewerUserId,
            profile.UserId,
            command.Competencies,
            files.Select(x => x.Id).ToHashSet(),
            command.Note,
            policy.Competency,
            now
        );
        qualifications.AddEvent(decision.Event);
        assessments.AddRange(decision.Assessments);
        // Tell the expert (email + in-app); older profiles without an email are skipped
        if (profile.ContactEmail != null)
        {
            var service = await catalog.FindAsync(qualification.ServiceCode, ct);
            outbox.Enqueue(
                new ExpertCompetencyDecidedEvent(
                    decision.Event.Id,
                    profile.UserId,
                    profile.ContactEmail,
                    profile.DisplayName ?? profile.ContactEmail,
                    qualification.Id,
                    qualification.ServiceCode,
                    service?.Name ?? qualification.ServiceCode,
                    qualification.Status,
                    now,
                    qualification.EarliestReapplyAt,
                    decision
                        .Assessments.Where(x => x.Result != CompetencyCriteria.Pass)
                        .Select(x => new CompetencyIssue(x.Competency, x.Result, x.Note))
                        .ToArray()
                ),
                now
            );
        }
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [applicantUserId],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await describer.DescribeAsync(qualification, ct);
    }
}
