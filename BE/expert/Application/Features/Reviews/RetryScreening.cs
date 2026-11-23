using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Retries a failed Gate 1 AI screening run (Section 4 #3).</summary>
public sealed record RetryScreeningCommand(Guid ReviewerUserId, Guid ApplicationId);

/// <summary>Starts a fresh screening run when the previous run failed or timed out.</summary>
public sealed class RetryScreeningHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IExpertPolicyProvider policies,
    IScreeningCoordinator screening,
    IScreeningWakeup wakeup,
    IReviewDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<RetryScreeningCommand, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        RetryScreeningCommand command,
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
        if (application.Status != ExpertApplicationStatus.Submitted)
            throw ExpertErrors.ApplicationNotInReview(application.Status);

        var now = clock.GetUtcNow();
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        application.EnsureClaimedBy(command.ReviewerUserId, now, hold);

        var files = await evidences.ListTrackedAsync(application.Id, ct);
        var history = await applications.ListEventsAsync(application.Id, ct);
        var run = await screening.RetryAsync(
            application,
            files,
            history,
            command.ReviewerUserId,
            now,
            ct
        );

        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        if (run.Status == ScreeningRunStatuses.Running)
            wakeup.Notify();
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Applications,
            [],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(application, ct);
    }
}
