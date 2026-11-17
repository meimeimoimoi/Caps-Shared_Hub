using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Resolves or reopens one Gate 1 screening point while the application is in review.</summary>
public sealed record ResolveScreeningPointCommand(
    Guid ReviewerUserId,
    Guid ApplicationId,
    Guid PointId,
    string Action,
    string? Reason
);

/// <summary>
/// Handles a reviewer marking a screening point as CHECKED (reason required), USED_FOR_SUPPLEMENT,
/// or REOPEN before concluding Gate 1.
/// </summary>
public sealed class ResolveScreeningPointHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IScreeningRepository screeningRepo,
    IExpertPolicyProvider policies,
    IReviewDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<ResolveScreeningPointCommand, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        ResolveScreeningPointCommand command,
        CancellationToken ct
    )
    {
        var action = command.Action.Trim().ToUpperInvariant();
        if (
            action
            is not (
                ScreeningPointActions.Checked
                or ScreeningPointActions.UsedForSupplement
                or ScreeningPointActions.Reopen
            )
        )
        {
            throw ExpertErrors.InvalidScreeningPointAction();
        }

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

        var run =
            await screeningRepo.FindLatestRunAsync(application.Id, ct)
            ?? throw ExpertErrors.ScreeningNotFound();
        var point =
            await screeningRepo.FindPointAsync(command.PointId, run.Id, ct)
            ?? throw ExpertErrors.ScreeningPointNotFound();

        string eventType;
        string message;
        if (action == ScreeningPointActions.Checked)
        {
            point.MarkChecked(command.ReviewerUserId, command.Reason, now);
            eventType = ScreeningEventTypes.PointChecked;
            message = $"Đã kiểm tra \"{point.Title}\": {point.ResolutionReason}";
        }
        else if (action == ScreeningPointActions.UsedForSupplement)
        {
            point.UseForSupplement(command.ReviewerUserId, command.Reason, now);
            eventType = ScreeningEventTypes.PointUsedForSupplement;
            message = $"Dùng làm yêu cầu bổ sung: \"{point.Title}\".";
        }
        else
        {
            point.Reopen();
            eventType = ScreeningEventTypes.PointReopened;
            message = $"Mở lại điểm kiểm tra \"{point.Title}\".";
        }

        screeningRepo.AddEvent(
            ScreeningEvent.Record(
                application.Id,
                run.Id,
                command.ReviewerUserId,
                false,
                eventType,
                message,
                now
            )
        );

        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Applications,
            [],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(application, ct);
    }
}
