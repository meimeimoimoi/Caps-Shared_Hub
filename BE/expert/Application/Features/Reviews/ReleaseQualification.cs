using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>The holder gives a Gate 2 qualification back to the shared queue.</summary>
public sealed record ReleaseQualificationCommand(Guid ReviewerUserId, Guid QualificationId);

/// <summary>Releases the claim under the expert's lock and records it in the claim history.</summary>
public sealed class ReleaseQualificationHandler(
    IApplicantLock locks,
    IQualificationRepository qualifications,
    IReviewClaimEventRepository claimEvents,
    IQualificationReviewDescriber describer,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ReleaseQualificationCommand, ReviewQualificationResponse>
{
    public async Task<ReviewQualificationResponse> HandleAsync(
        ReleaseQualificationCommand command,
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
        claimEvents.Add(qualification.Release(command.ReviewerUserId, clock.GetUtcNow(), hold));
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Qualifications,
            [],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await describer.DescribeAsync(qualification, ct);
    }
}
