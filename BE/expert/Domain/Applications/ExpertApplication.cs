using Caps.Common.Domain;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Domain.Applications;

/// <summary>
/// One Expert Eligibility Application submission (Gate 1). Re-applying after NOT_ELIGIBLE/REJECTED
/// creates a new row linked to the previous one (BR-E23); past results are never overwritten.
/// Every status change returns the audit event to store with it.
/// </summary>
public sealed class ExpertApplication
{
    private ExpertApplication() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; } = default!;
    public string Status { get; private set; } = ExpertApplicationStatus.Draft;

    /// <summary>Latest submission (first submit or supplement); full history is in Events.</summary>
    public DateTimeOffset? SubmittedAt { get; private set; }
    public DateTimeOffset? DecidedAt { get; private set; }
    public string? DecisionNote { get; private set; }
    public Guid? PreviousApplicationId { get; private set; }
    public DateTimeOffset? EarliestReapplyAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>Reviewer working on the review; kept through NEED_MORE_INFORMATION, cleared by the final result.</summary>
    public Guid? ClaimedByUserId { get; private set; }

    /// <summary>When the claim started or was last renewed by a resubmission; the hold counts from here.</summary>
    public DateTimeOffset? ClaimedAt { get; private set; }

    public ICollection<ExpertEvidence> Evidences { get; } = [];
    public ICollection<ExpertApplicationEvent> Events { get; } = [];

    public bool CanEdit => Status == ExpertApplicationStatus.Draft;
    public bool NeedsInformation => Status == ExpertApplicationStatus.NeedMoreInformation;

    /// <summary>Declared details can be changed while drafting and while more information is requested.</summary>
    public bool CanEditDetails => CanEdit || NeedsInformation;
    public bool AcceptsFiles => CanEdit || NeedsInformation;

    /// <summary>Only applications waiting for a Gate 1 decision can be claimed.</summary>
    public bool IsClaimable => Status == ExpertApplicationStatus.Submitted;

    /// <summary>The reviewer holding the application now, or null when it is free (never claimed or expired).</summary>
    public Guid? ClaimHolder(DateTimeOffset now, TimeSpan hold) =>
        ReviewClaimRules.IsActive(ClaimedByUserId, ClaimedAt, NeedsInformation, now, hold)
            ? ClaimedByUserId
            : null;

    public DateTimeOffset? ClaimExpiresAt(TimeSpan hold) =>
        ReviewClaimRules.ExpiresAt(ClaimedByUserId, ClaimedAt, NeedsInformation, hold);

    /// <summary>
    /// Checks that the reviewer may claim the application and returns the history entry, or null when they
    /// already hold it. The caller stores the claim with one conditional update, so of two reviewers claiming
    /// at once only one wins.
    /// </summary>
    public ReviewClaimEvent? Claim(
        Guid reviewerUserId,
        Guid applicantUserId,
        DateTimeOffset now,
        TimeSpan hold
    )
    {
        if (!IsClaimable)
            throw ExpertErrors.ApplicationNotInReview(Status);
        if (reviewerUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        var holder = ClaimHolder(now, hold);
        if (holder == reviewerUserId)
            return null;
        if (holder != null)
            throw ExpertErrors.ReviewClaimed();
        var expired = ClaimedByUserId == reviewerUserId ? null : ClaimedByUserId;
        return ReviewClaimEvent.Record(
            ReviewGate.Eligibility,
            Id,
            ReviewClaimAction.Claim,
            reviewerUserId,
            reviewerUserId,
            expired,
            null,
            now
        );
    }

    /// <summary>Throws unless the reviewer holds the application now (decisions need an active claim).</summary>
    public void EnsureClaimedBy(Guid reviewerUserId, DateTimeOffset now, TimeSpan hold)
    {
        if (ClaimHolder(now, hold) != reviewerUserId)
            throw ExpertErrors.ReviewNotClaimed();
    }

    /// <summary>The holder gives the application back to the shared queue.</summary>
    public ReviewClaimEvent Release(Guid reviewerUserId, DateTimeOffset now, TimeSpan hold)
    {
        EnsureClaimedBy(reviewerUserId, now, hold);
        ClaimedByUserId = null;
        ClaimedAt = null;
        UpdatedAt = now;
        return ReviewClaimEvent.Record(
            ReviewGate.Eligibility,
            Id,
            ReviewClaimAction.Release,
            reviewerUserId,
            null,
            reviewerUserId,
            null,
            now
        );
    }

    /// <summary>
    /// A System Admin hands the application to another reviewer (reason required); the hold restarts. The new
    /// reviewer cannot be the applicant.
    /// </summary>
    public ReviewClaimEvent Reassign(
        Guid adminUserId,
        Guid reviewerUserId,
        Guid applicantUserId,
        string? reason,
        DateTimeOffset now,
        TimeSpan hold
    )
    {
        if (!IsClaimable && !NeedsInformation)
            throw ExpertErrors.ApplicationNotInReview(Status);
        if (reviewerUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        var cleaned = ReviewClaimRules.CleanReason(reason);
        var previous = ClaimHolder(now, hold);
        ClaimedByUserId = reviewerUserId;
        ClaimedAt = now;
        UpdatedAt = now;
        return ReviewClaimEvent.Record(
            ReviewGate.Eligibility,
            Id,
            ReviewClaimAction.Reassign,
            adminUserId,
            reviewerUserId,
            previous,
            cleaned,
            now
        );
    }

    /// <summary>Opens a new draft; refused while the previous result still blocks re-applying.</summary>
    public static (ExpertApplication Application, ExpertApplicationEvent Opened) Open(
        Guid profileId,
        ExpertApplication? previous,
        Guid actorUserId,
        DateTimeOffset now
    )
    {
        if (previous?.Status == ExpertApplicationStatus.Eligible)
            throw ExpertErrors.AlreadyEligible();
        if (previous?.EarliestReapplyAt > now)
            throw ExpertErrors.ReapplyTooEarly(previous.EarliestReapplyAt.Value);
        var application = new ExpertApplication
        {
            ExpertProfileId = profileId,
            PreviousApplicationId = previous?.Id,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var opened = ExpertApplicationEvent.Record(
            application.Id,
            actorUserId,
            null,
            ExpertApplicationStatus.Draft,
            null,
            now
        );
        return (application, opened);
    }

    public void EnsureEditable()
    {
        if (!CanEdit)
            throw ExpertErrors.ApplicationLocked(Status);
    }

    public void EnsureDetailsEditable()
    {
        if (!CanEditDetails)
            throw ExpertErrors.ApplicationLocked(Status);
    }

    /// <summary>Throws unless the application can take a new file now.</summary>
    /// <param name="supplement">Supplementary files are only accepted while more information is requested.</param>
    public void EnsureAcceptsFile(bool supplement)
    {
        if (!AcceptsFiles)
            throw ExpertErrors.ApplicationLocked(Status);
        if (supplement && !NeedsInformation)
            throw ExpertErrors.SupplementNotRequested();
    }

    /// <summary>Only files added after the latest submission (while supplementing) can be removed; submitted files are historical evidence.</summary>
    public bool CanRemove(ExpertEvidence evidence) =>
        CanEdit || (NeedsInformation && evidence.CreatedAt > SubmittedAt);

    public void Touch(DateTimeOffset now) => UpdatedAt = now;

    /// <summary>Submits the draft for screening and records the submission event.</summary>
    /// <param name="snapshot">What the applicant declared, kept on the submission event.</param>
    public ExpertApplicationEvent Submit(
        Guid actorUserId,
        DateTimeOffset now,
        ProfileSnapshot? snapshot = null
    )
    {
        EnsureEditable();
        SubmittedAt = now;
        return MoveTo(ExpertApplicationStatus.Submitted, actorUserId, null, now, snapshot);
    }

    /// <summary>BR-E05: after supplementing, return to the pending step (Gate 1 after submission).</summary>
    /// <param name="snapshot">What the applicant declared for this submission, kept on its event.</param>
    public ExpertApplicationEvent Resubmit(
        Guid actorUserId,
        string? note,
        DateTimeOffset now,
        ProfileSnapshot? snapshot = null
    )
    {
        if (!NeedsInformation)
            throw ExpertErrors.ApplicationLocked(Status);
        SubmittedAt = now;
        // The reviewer who asked for more keeps the application; the hold restarts from the resubmission
        if (ClaimedByUserId != null)
            ClaimedAt = now;
        return MoveTo(ExpertApplicationStatus.Submitted, actorUserId, note, now, snapshot);
    }

    /// <summary>
    /// Gate 1 decision by an authorized reviewer (BR-E04). The outcome follows from the requirement results:
    /// any FAIL → NOT_ELIGIBLE (closed, reapply after the policy interval, BR-E21); otherwise any
    /// NEED_MORE_INFORMATION → back to the applicant in the same application (BR-E05); all PASS → ELIGIBLE.
    /// </summary>
    /// <param name="applicantUserId">Owner of the application; reviewers cannot decide their own.</param>
    /// <param name="yearsExperience">Declared years, the basis of EV-06.</param>
    public EligibilityDecision DecideEligibility(
        Guid reviewerUserId,
        Guid applicantUserId,
        int? yearsExperience,
        IReadOnlyCollection<CriterionResult> results,
        string? note,
        EligibilityPolicy policy,
        DateTimeOffset now
    )
    {
        if (Status != ExpertApplicationStatus.Submitted)
            throw ExpertErrors.ApplicationNotInReview(Status);
        if (reviewerUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        var cleaned = EligibilityRules.Validate(results, yearsExperience, policy);
        var status = EligibilityRules.Outcome(cleaned);

        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        DecisionNote = note;
        if (status != ExpertApplicationStatus.NeedMoreInformation)
            DecidedAt = now;
        if (status == ExpertApplicationStatus.NotEligible)
            EarliestReapplyAt = now + policy.ReapplyAfterNotEligible;
        // A final result frees the reviewer; NEED_MORE_INFORMATION keeps them for the resubmission
        if (status != ExpertApplicationStatus.NeedMoreInformation)
        {
            ClaimedByUserId = null;
            ClaimedAt = null;
        }
        var decided = MoveTo(status, reviewerUserId, note, now);
        var checks = cleaned
            .Select(x =>
                EligibilityCheck.Record(decided, x, reviewerUserId, policy.MinYearsExperience)
            )
            .ToArray();
        return new(decided, checks);
    }

    private ExpertApplicationEvent MoveTo(
        string status,
        Guid actorUserId,
        string? note,
        DateTimeOffset now,
        ProfileSnapshot? snapshot = null
    )
    {
        var recorded = ExpertApplicationEvent.Record(
            Id,
            actorUserId,
            Status,
            status,
            note,
            now,
            snapshot
        );
        Status = status;
        UpdatedAt = now;
        return recorded;
    }
}
