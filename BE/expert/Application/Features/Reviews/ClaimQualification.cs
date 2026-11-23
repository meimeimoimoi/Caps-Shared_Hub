using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>A reviewer takes a Gate 2 qualification from the shared queue.</summary>
/// <param name="ReviewerEmail">From the access token, shown to other reviewers as the holder.</param>
public sealed record ClaimQualificationCommand(
    Guid ReviewerUserId,
    string? ReviewerEmail,
    Guid QualificationId
);

/// <summary>
/// Claims the qualification with one conditional update: of two reviewers claiming at once only one wins, the
/// other gets REVIEW_CLAIMED. Claiming again while holding it changes nothing.
/// </summary>
public sealed class ClaimQualificationHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IReviewClaimEventRepository claimEvents,
    IKnownReviewerRecorder reviewers,
    IQualificationReviewDescriber describer,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ClaimQualificationCommand, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        ClaimQualificationCommand command,
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
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        var now = clock.GetUtcNow();
        var claimed = qualification.Claim(command.ReviewerUserId, applicantUserId, now, hold);
        await reviewers.RecordAsync(command.ReviewerUserId, command.ReviewerEmail, now, ct);
        if (claimed != null)
        {
            var won = await qualifications.TryClaimAsync(
                qualification,
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
                ExpertRealtimeTopics.Qualifications,
                [],
                [Permission.ExpertReview, Permission.ExpertApprove],
                ct
            );
        }
        return await describer.DescribeAsync(qualification, ct);
    }
}
