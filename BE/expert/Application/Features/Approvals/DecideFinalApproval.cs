using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Features.Approvals;

/// <summary>A System Admin's final approval: APPROVE or RETURN_FOR_REVIEW, with a note.</summary>
public sealed record DecideFinalApprovalCommand(
    Guid ApproverUserId,
    Guid QualificationId,
    string Decision,
    string? Note
);

/// <summary>
/// Records the final approval of a Gate 2 PASS. Runs under the expert's lock, so it cannot interleave with
/// another decision on the same qualification.
/// </summary>
public sealed class DecideFinalApprovalHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IReviewClaimEventRepository claimEvents,
    IServiceAccessNotifier notifier,
    IQualificationReviewDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<DecideFinalApprovalCommand, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        DecideFinalApprovalCommand command,
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
        var decision = command.Decision.Trim().ToUpperInvariant();
        var now = clock.GetUtcNow();
        var decided = qualification.DecideFinalApproval(
            command.ApproverUserId,
            qualification.ExpertProfile.UserId,
            decision,
            command.Note,
            now
        );
        qualifications.AddEvent(decided);
        // A return hands the review back to the Gate 2 reviewer; keep that hand-over in the claim history (R11)
        if (
            decision == FinalApprovalDecision.ReturnForReview
            && qualification.ClaimedByUserId is Guid holder
        )
        {
            claimEvents.Add(
                ReviewClaimEvent.Record(
                    ReviewGate.Competency,
                    qualification.Id,
                    ReviewClaimAction.Reassign,
                    command.ApproverUserId,
                    holder,
                    null,
                    // The return note may be longer than a claim reason; the full note stays on the status event
                    decided.Note
                        is { Length: > ReviewClaimRules.MaxReasonLength } longNote
                        ? longNote[..ReviewClaimRules.MaxReasonLength]
                        : decided.Note,
                    now
                )
            );
        }
        // A return stays between the admin and the reviewer: the expert is told only of the approval (D3)
        var approved = decision == FinalApprovalDecision.Approve;
        if (approved)
            await notifier.EnqueueAsync(qualification, decided, "APPROVED", ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            approved ? [applicantUserId] : [],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await describer.DescribeAsync(qualification, ct);
    }
}
