using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>Assigns a SUPPLEMENT evidence file to a target group (CV or EV-01…EV-05).</summary>
public sealed record AssignSupplementGroupCommand(
    Guid ReviewerUserId,
    Guid ApplicationId,
    Guid EvidenceId,
    string? GroupCode
);

/// <summary>Lets a reviewer classify an unclassified supplementary file into its Gate 1 group.</summary>
public sealed class AssignSupplementGroupHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IScreeningRepository screeningRepo,
    IExpertPolicyProvider policies,
    IReviewDescriber describer,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<AssignSupplementGroupCommand, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        AssignSupplementGroupCommand command,
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

        var evidence =
            await evidences.FindAsync(command.EvidenceId, application.Id, ct)
            ?? throw ExpertErrors.EvidenceNotFound();
        evidence.AssignGroup(command.GroupCode);

        var latestRun = await screeningRepo.FindLatestRunAsync(application.Id, ct);
        if (latestRun != null)
        {
            if (!string.IsNullOrEmpty(evidence.AssignedGroup))
            {
                var points = await screeningRepo.ListPointsAsync(latestRun.Id, ct);
                foreach (
                    var point in points.Where(p =>
                        p.Code == ScreeningPointCodes.SysUnclassifiedSupplement
                        && p.EvidenceId == evidence.Id
                        && p.IsOpen
                    )
                )
                {
                    point.MarkChecked(
                        command.ReviewerUserId,
                        $"Đã xếp vào nhóm {evidence.AssignedGroup}.",
                        now
                    );
                }
            }

            screeningRepo.AddEvent(
                ScreeningEvent.Record(
                    application.Id,
                    latestRun.Id,
                    command.ReviewerUserId,
                    false,
                    ScreeningEventTypes.SupplementAssigned,
                    evidence.AssignedGroup != null
                        ? $"Xếp file bổ sung \"{evidence.FileName}\" vào nhóm {evidence.AssignedGroup}."
                        : $"Bỏ phân nhóm file bổ sung \"{evidence.FileName}\".",
                    now
                )
            );
        }

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
