using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Features.Assignments;

/// <summary>A System Admin hands a Gate 1 application to another reviewer, with a reason.</summary>
public sealed record ReassignApplicationCommand(
    Guid AdminUserId,
    Guid ApplicationId,
    Guid ReviewerUserId,
    string? Reason
);

/// <summary>
/// Reassigns under the applicant's lock. The new reviewer must be a known reviewer (seen with the review
/// permission) and not the applicant; the hold restarts for them.
/// </summary>
public sealed class ReassignApplicationHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IKnownReviewerRepository reviewers,
    IReviewClaimEventRepository claimEvents,
    IReviewClaimDescriber claims,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ReassignApplicationCommand, ReviewClaimStateResponse>
{
    public async Task<ReviewClaimStateResponse> HandleAsync(
        ReassignApplicationCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var applicantUserId =
            await applications.FindApplicantUserIdAsync(command.ApplicationId, ct)
            ?? throw ExpertErrors.ApplicationNotFound();
        await locks.AcquireAsync(applicantUserId, ct);
        var application =
            await applications.FindWithProfileAsync(command.ApplicationId, ct)
            ?? throw ExpertErrors.ApplicationNotFound();
        _ =
            await reviewers.FindAsync(command.ReviewerUserId, ct)
            ?? throw ExpertErrors.ReviewerNotFound();
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        var now = clock.GetUtcNow();
        claimEvents.Add(
            application.Reassign(
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
            ExpertRealtimeTopics.Applications,
            [],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await claims.DescribeAsync(
            ReviewGate.Eligibility,
            application.Id,
            application.ClaimHolder(now, hold),
            application.ClaimedAt,
            application.ClaimExpiresAt(hold),
            application.IsClaimable,
            applicantUserId,
            ct
        );
    }
}
