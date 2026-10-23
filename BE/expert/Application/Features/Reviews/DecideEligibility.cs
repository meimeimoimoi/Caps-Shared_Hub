using Caps.Common.Application;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

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
/// applicant's own changes or with another reviewer deciding the same application. Only the reviewer holding
/// the application decides; a final result frees it, NEED_MORE_INFORMATION keeps it for the resubmission.
/// </summary>
public sealed class DecideEligibilityHandler(
    IApplicantLock locks,
    IExpertApplicationRepository applications,
    IEligibilityCheckRepository eligibility,
    IQualificationRepository qualifications,
    IServiceCatalogRepository catalog,
    IExpertNotificationOutbox outbox,
    IReviewDescriber describer,
    IExpertPolicyProvider policies,
    ExpertPolicyOptions options,
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
        var now = clock.GetUtcNow();
        // Only the reviewer holding the application decides it, checked before any business rule
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        application.EnsureClaimedBy(command.ReviewerUserId, now, hold);
        // EV-06 is judged on the years in the submitted snapshot, not on later edits
        var history = await applications.ListEventsAsync(application.Id, ct);
        var snapshot = ExpertApplicationEvent.LatestSnapshot(history);

        var policy = await policies.GetEligibilityAsync(ct);
        // EV-04/EV-05 pass on the statement agreed to in the submission unless the reviewer sent another
        // result with grounds; older submissions have no statement, so the reviewer judges them as usual
        var proven =
            snapshot != null ? options.Submission.CriteriaProvenBy(snapshot.Declarations) : [];
        var criteria = EligibilityRules.PassByDeclarations(command.Criteria, proven);
        // M4: after the last allowed round the reviewer decides with the evidence at hand
        var work = await policies.GetReviewWorkAsync(ct);
        InformationRequestRules.EnsureAllowed(
            EligibilityRules.Outcome(criteria),
            InformationRequestRules.Count(history.Select(x => (x.FromStatus, x.ToStatus))),
            work.MaxInformationRequests
        );
        var decision = application.DecideEligibility(
            command.ReviewerUserId,
            profile.UserId,
            snapshot != null ? snapshot.YearsExperience : profile.YearsExperience,
            criteria,
            command.Note,
            policy,
            now
        );
        applications.AddEvent(decision.Event);
        eligibility.AddRange(decision.Checks);
        profile.MirrorStatus(application.Status, now);
        var registered = await RegisterOnlyServiceAsync(application, now, ct);
        // Tell the applicant (email + in-app); older profiles without an email are skipped.
        // NOT_APPLICABLE needs no action from the applicant, so only FAIL and NEED_MORE_INFORMATION are listed
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
                        .Checks.Where(x => EligibilityCriteria.IsIssue(x.Result))
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
        if (registered)
        {
            await realtime.ChangedAsync(
                ExpertRealtimeTopics.Qualifications,
                [profile.UserId],
                [Permission.ExpertReview],
                ct
            );
        }
        return await describer.DescribeAsync(application, ct);
    }

    /// <summary>
    /// Q2: ELIGIBLE while the catalog offers exactly one service opens its competency assessment (PREPARING) in
    /// the same transaction. Skipped when the expert already has a qualification for it (Q3), so it never
    /// fails the Gate 1 decision.
    /// </summary>
    private async Task<bool> RegisterOnlyServiceAsync(
        ExpertApplication application,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        if (application.Status != ExpertApplicationStatus.Eligible)
            return false;
        var service = ServiceAutoRegistration.OnlyService(await catalog.ListActiveAsync(ct));
        var existing =
            service == null
                ? null
                : await qualifications.FindLatestAsync(
                    application.ExpertProfileId,
                    service.Code,
                    ct
                );
        if (!ServiceAutoRegistration.ShouldRegister(service, existing))
            return false;
        var (qualification, opened) = ExpertServiceQualification.Register(
            application,
            service!.Code,
            null,
            application.ExpertProfile.UserId,
            now,
            ServiceAutoRegistration.Note
        );
        qualifications.Add(qualification);
        qualifications.AddEvent(opened);
        return true;
    }
}
