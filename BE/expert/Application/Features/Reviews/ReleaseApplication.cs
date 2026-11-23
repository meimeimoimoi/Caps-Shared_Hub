using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>The holder gives a Gate 1 application back to the shared queue.</summary>
public sealed record ReleaseApplicationCommand(Guid ReviewerUserId, Guid ApplicationId);

/// <summary>Releases the claim under the applicant's lock and records it in the claim history.</summary>
public sealed class ReleaseApplicationHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IReviewClaimEventRepository claimEvents,
    IReviewDescriber describer,
    IExpertPolicyProvider policies,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ReleaseApplicationCommand, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        ReleaseApplicationCommand command,
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
        claimEvents.Add(application.Release(command.ReviewerUserId, clock.GetUtcNow(), hold));
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Applications,
            [],
            [Permission.ExpertReview, Permission.ExpertApprove],
            ct
        );
        return await describer.DescribeAsync(application, ct);
    }
}
