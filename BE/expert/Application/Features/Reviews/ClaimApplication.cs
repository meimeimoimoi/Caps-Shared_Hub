using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>A reviewer takes a Gate 1 application from the shared queue.</summary>
/// <param name="ReviewerEmail">From the access token, shown to other reviewers as the holder.</param>
public sealed record ClaimApplicationCommand(
    Guid ReviewerUserId,
    string? ReviewerEmail,
    Guid ApplicationId
);

/// <summary>
/// Claims the application with one conditional update: of two reviewers claiming at once only one wins, the
/// other gets REVIEW_CLAIMED. Claiming again while holding it changes nothing.
/// </summary>
public sealed class ClaimApplicationHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IReviewClaimEventRepository claimEvents,
    IKnownReviewerRecorder reviewers,
    IReviewDescriber describer,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ClaimApplicationCommand, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        ClaimApplicationCommand command,
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
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        var now = clock.GetUtcNow();
        var claimed = application.Claim(command.ReviewerUserId, applicantUserId, now, hold);
        await reviewers.RecordAsync(command.ReviewerUserId, command.ReviewerEmail, now, ct);
        if (claimed != null)
        {
            var won = await applications.TryClaimAsync(
                application,
                command.ReviewerUserId,
                now,
                now - hold,
                ct
            );
            if (!won)
                throw ExpertErrors.ReviewClaimed();
            claimEvents.Add(claimed);
        }
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        if (claimed != null)
        {
            await realtime.ChangedAsync(
                ExpertRealtimeTopics.Applications,
                [],
                [Permission.ExpertReview, Permission.ExpertApprove],
                ct
            );
        }
        return await describer.DescribeAsync(application, ct);
    }
}
