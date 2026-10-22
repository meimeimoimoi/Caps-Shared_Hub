using Caps.Common.Application;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Features.Reviews;

/// <summary>A reviewer's Gate 1 results for EV-01…EV-06 with an optional overall note.</summary>
public sealed record DecideEligibilityCommand(
    Guid ReviewerUserId,
    Guid ApplicationId,
    IReadOnlyList<CriterionResult> Criteria,
    string? Note
);

/// <summary>
/// Records the Gate 1 decision. Runs under the applicant's lock, so it cannot interleave with the
/// applicant's own changes or with another reviewer deciding the same application.
/// </summary>
public sealed class DecideEligibilityHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IEligibilityCheckRepository eligibility,
    IExpertNotificationOutbox outbox,
    IReviewDescriber describer,
    ExpertPolicyOptions policy,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    IRealtimeNotifier realtime
) : ICommandHandler<DecideEligibilityCommand, ReviewApplicationResponse>
{
    public async Task<ReviewApplicationResponse> HandleAsync(
        DecideEligibilityCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var applicantUserId =
            await applications.FindApplicantUserIdAsync(command.ApplicationId, ct)
            ?? throw ExpertErrors.ApplicationNotFound();
        await locks.AcquireAsync(applicantUserId, ct);
        // Loaded after the lock so the status check sees the latest committed state
        var application =
            await applications.FindWithProfileAsync(command.ApplicationId, ct)
            ?? throw ExpertErrors.ApplicationNotFound();
        var profile = application.ExpertProfile;
        // EV-06 is judged on the years in the submitted snapshot, not on later edits
        var snapshot = ExpertApplicationEvent.LatestSnapshot(
            await applications.ListEventsAsync(application.Id, ct)
        );

        var now = clock.GetUtcNow();
        var decision = application.DecideEligibility(
            command.ReviewerUserId,
            profile.UserId,
            snapshot != null ? snapshot.YearsExperience : profile.YearsExperience,
            command.Criteria,
            command.Note,
            policy.Eligibility,
            now
        );
        applications.AddEvent(decision.Event);
        eligibility.AddRange(decision.Checks);
        profile.MirrorStatus(application.Status, now);
        // Tell the applicant (email + in-app); older profiles without an email are skipped
        if (profile.ContactEmail != null)
        {
            outbox.Enqueue(
                new ExpertEligibilityDecidedEvent(
                    decision.Event.Id,
                    profile.UserId,
                    profile.ContactEmail,
                    profile.DisplayName ?? profile.ContactEmail,
                    application.Id,
                    application.Status,
                    now,
                    application.EarliestReapplyAt,
                    decision
                        .Checks.Where(x => x.Result != EligibilityCriteria.Pass)
                        .Select(x => new EligibilityIssue(x.Criterion, x.Result, x.Note))
                        .ToArray()
                ),
                now
            );
        }
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await realtime.ChangedAsync(
            ExpertRealtimeTopics.Applications,
            [profile.UserId],
            [Permission.ExpertReview],
            ct
        );
        return await describer.DescribeAsync(application, ct);
    }
}
