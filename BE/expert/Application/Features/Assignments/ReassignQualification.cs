using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Features.Assignments;

/// <summary>A System Admin hands a Gate 2 qualification to another reviewer, with a reason.</summary>
public sealed record ReassignQualificationCommand(
    Guid AdminUserId,
    Guid QualificationId,
    Guid ReviewerUserId,
    string? Reason
);

/// <summary>
/// Reassigns under the expert's lock. The new reviewer must be a known reviewer (seen with the review
/// permission) and not the expert; the hold restarts for them.
/// </summary>
public sealed class ReassignQualificationHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IKnownReviewerRepository reviewers,
    IReviewClaimEventRepository claimEvents,
    IReviewClaimDescriber claims,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ReassignQualificationCommand, ReviewClaimStateResponse>
{
    public async Task<ReviewClaimStateResponse> HandleAsync(
        ReassignQualificationCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var applicantUserId =
            await qualifications.FindApplicantUserIdAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        await locks.AcquireAsync(applicantUserId, ct);
        var qualification =
            await qualifications.FindWithProfileAsync(command.QualificationId, ct)
            ?? throw ExpertErrors.QualificationNotFound();
        _ =
            await reviewers.FindAsync(command.ReviewerUserId, ct)
            ?? throw ExpertErrors.ReviewerNotFound();
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        var now = clock.GetUtcNow();
        claimEvents.Add(
            qualification.Reassign(
                command.AdminUserId,
                command.ReviewerUserId,
                applicantUserId,
                command.Reason,
                now,
                hold
            )
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await claims.DescribeAsync(
            ReviewGate.Competency,
            qualification.Id,
            qualification.ClaimHolder(now, hold),
            qualification.ClaimedAt,
            qualification.ClaimExpiresAt(hold),
            qualification.IsClaimable,
            applicantUserId,
            ct
        );
    }
}
