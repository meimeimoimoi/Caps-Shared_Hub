using Caps.Common.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Domain.Qualifications;

/// <summary>
/// Gate 2 and final approval for one Expert–Service pair (BR-E12, BR-E30). Registering the service again
/// after FAIL creates a new row linked to the previous one (BR-E23); past results are never overwritten.
/// Every status change returns the audit event to store with it.
/// </summary>
public sealed class ExpertServiceQualification
{
    private ExpertServiceQualification() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public ExpertProfile ExpertProfile { get; } = default!;

    /// <summary>Catalog service code, e.g. HUMAN_VERIFICATION.</summary>
    public string ServiceCode { get; private set; } = default!;

    /// <summary>The ELIGIBLE Gate 1 application this assessment relies on (BR-E24).</summary>
    public Guid ApplicationId { get; private set; }
    public string Status { get; private set; } = QualificationStatus.CompetencyReview;

    /// <summary>Latest submission (registration or supplement); full history is in the events.</summary>
    public DateTimeOffset SubmittedAt { get; private set; }
    public DateTimeOffset? DecidedAt { get; private set; }
    public string? DecisionNote { get; private set; }

    /// <summary>Who passed Gate 2; final approval must be made by someone else (BR-E33).</summary>
    public Guid? CompetencyReviewerUserId { get; private set; }
    public Guid? PreviousQualificationId { get; private set; }
    public DateTimeOffset? EarliestReapplyAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>The expert takes new requests for this service; off until they turn it on.</summary>
    public bool AcceptingRequests { get; private set; }

    /// <summary>Reviewer working on Gate 2; kept through NEED_MORE_INFORMATION, cleared by the final result.</summary>
    public Guid? ClaimedByUserId { get; private set; }

    /// <summary>When the claim started or was last renewed (resubmission, return from final approval).</summary>
    public DateTimeOffset? ClaimedAt { get; private set; }

    public bool NeedsInformation => Status == QualificationStatus.NeedMoreInformation;

    /// <summary>Only qualifications waiting for a Gate 2 decision can be claimed.</summary>
    public bool IsClaimable => Status == QualificationStatus.CompetencyReview;

    /// <summary>The reviewer holding the qualification now, or null when it is free (never claimed or expired).</summary>
    public Guid? ClaimHolder(DateTimeOffset now, TimeSpan hold) =>
        ReviewClaimRules.IsActive(ClaimedByUserId, ClaimedAt, NeedsInformation, now, hold)
            ? ClaimedByUserId
            : null;

    public DateTimeOffset? ClaimExpiresAt(TimeSpan hold) =>
        ReviewClaimRules.ExpiresAt(ClaimedByUserId, ClaimedAt, NeedsInformation, hold);

    /// <summary>
    /// A re-registration after FAIL that has not been sent for review yet: it needs new or updated
    /// competency evidence before the reviewer sees it (BR-E22).
    /// </summary>
    public bool AwaitsNewEvidence => PreviousQualificationId != null && SubmittedAt == CreatedAt;

    /// <summary>
    /// Registers the expert for a service, straight into competency review (state model 4.2, row 1).
    /// Requires an ELIGIBLE Gate 1 application (BR-E07) and, after FAIL, the policy interval (BR-E22);
    /// a re-registration first waits for new competency evidence in NEED_MORE_INFORMATION.
    /// </summary>
    /// <param name="previous">The latest qualification of the same service, if any.</param>
    public static (ExpertServiceQualification Qualification, QualificationEvent Opened) Register(
        ExpertApplication eligibility,
        string serviceCode,
        ExpertServiceQualification? previous,
        Guid actorUserId,
        DateTimeOffset now
    )
    {
        if (eligibility.Status != ExpertApplicationStatus.Eligible)
            throw ExpertErrors.EligibilityRequired();
        if (previous != null && !QualificationStatus.IsClosed(previous.Status))
            throw ExpertErrors.QualificationExists(previous.Status);
        if (previous?.EarliestReapplyAt > now)
            throw ExpertErrors.ReapplyTooEarly(previous.EarliestReapplyAt.Value);
        var status =
            previous == null
                ? QualificationStatus.CompetencyReview
                : QualificationStatus.NeedMoreInformation;
        var qualification = new ExpertServiceQualification
        {
            ExpertProfileId = eligibility.ExpertProfileId,
            Status = status,
            ServiceCode = serviceCode,
            ApplicationId = eligibility.Id,
            PreviousQualificationId = previous?.Id,
            SubmittedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var opened = QualificationEvent.Record(
            qualification.Id,
            actorUserId,
            null,
            status,
            null,
            now
        );
        return (qualification, opened);
    }

    /// <summary>Files are only accepted while more information is requested.</summary>
    public void EnsureAcceptsFile()
    {
        if (!NeedsInformation)
            throw ExpertErrors.QualificationLocked(Status);
    }

    /// <summary>Only files added since the latest submission can be removed; earlier ones are historical evidence.</summary>
    public bool CanRemove(ExpertEvidence evidence) =>
        NeedsInformation && evidence.QualificationId == Id && evidence.CreatedAt > SubmittedAt;

    public void Touch(DateTimeOffset now) => UpdatedAt = now;

    /// <summary>
    /// Checks that the reviewer may claim the qualification and returns the history entry, or null when they
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
            throw ExpertErrors.QualificationNotInReview(Status);
        if (reviewerUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        var holder = ClaimHolder(now, hold);
        if (holder == reviewerUserId)
            return null;
        if (holder != null)
            throw ExpertErrors.ReviewClaimed();
        var expired = ClaimedByUserId == reviewerUserId ? null : ClaimedByUserId;
        return ReviewClaimEvent.Record(
            ReviewGate.Competency,
            Id,
            ReviewClaimAction.Claim,
            reviewerUserId,
            reviewerUserId,
            expired,
            null,
            now
        );
    }

    /// <summary>Throws unless the reviewer holds the qualification now (decisions need an active claim).</summary>
    public void EnsureClaimedBy(Guid reviewerUserId, DateTimeOffset now, TimeSpan hold)
    {
        if (ClaimHolder(now, hold) != reviewerUserId)
            throw ExpertErrors.ReviewNotClaimed();
    }

    /// <summary>The holder gives the qualification back to the shared queue.</summary>
    public ReviewClaimEvent Release(Guid reviewerUserId, DateTimeOffset now, TimeSpan hold)
    {
        EnsureClaimedBy(reviewerUserId, now, hold);
        ClaimedByUserId = null;
        ClaimedAt = null;
        UpdatedAt = now;
        return ReviewClaimEvent.Record(
            ReviewGate.Competency,
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
    /// A System Admin hands the qualification to another reviewer (reason required); the hold restarts. The
    /// new reviewer cannot be the expert.
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
            throw ExpertErrors.QualificationNotInReview(Status);
        if (reviewerUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        var cleaned = ReviewClaimRules.CleanReason(reason);
        var previous = ClaimHolder(now, hold);
        ClaimedByUserId = reviewerUserId;
        ClaimedAt = now;
        UpdatedAt = now;
        return ReviewClaimEvent.Record(
            ReviewGate.Competency,
            Id,
            ReviewClaimAction.Reassign,
            adminUserId,
            reviewerUserId,
            previous,
            cleaned,
            now
        );
    }

    /// <summary>After supplementing, back to competency review in the same qualification (row 3).</summary>
    public QualificationEvent Resubmit(Guid actorUserId, string? note, DateTimeOffset now)
    {
        if (!NeedsInformation)
            throw ExpertErrors.QualificationLocked(Status);
        SubmittedAt = now;
        // The reviewer who asked for more keeps the qualification; the hold restarts from the resubmission
        if (ClaimedByUserId != null)
            ClaimedAt = now;
        return MoveTo(QualificationStatus.CompetencyReview, actorUserId, note, now);
    }

    /// <summary>
    /// Gate 2 decision by an authorized reviewer (BR-E37). The outcome follows from the competency results:
    /// any FAIL → FAIL (closed, reapply after the policy interval); otherwise any NEED_MORE_INFORMATION →
    /// back to the expert in the same qualification; all PASS → PENDING_FINAL_APPROVAL. Years of experience
    /// or keywords never pass a competency by themselves (BR-E08): every result is the reviewer's.
    /// </summary>
    /// <param name="applicantUserId">Owner of the qualification; reviewers cannot decide their own.</param>
    /// <param name="evidenceIds">Files the reviewer may cite for this qualification.</param>
    public CompetencyDecision DecideCompetency(
        Guid reviewerUserId,
        Guid applicantUserId,
        IReadOnlyCollection<CompetencyResult> results,
        IReadOnlySet<Guid> evidenceIds,
        string? note,
        CompetencyPolicy policy,
        DateTimeOffset now
    )
    {
        if (Status != QualificationStatus.CompetencyReview)
            throw ExpertErrors.QualificationNotInReview(Status);
        if (reviewerUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        var cleaned = CompetencyRules.Validate(results, evidenceIds);
        var status = CompetencyRules.Outcome(cleaned);

        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        DecisionNote = note;
        if (status != QualificationStatus.NeedMoreInformation)
            DecidedAt = now;
        if (status == QualificationStatus.PendingFinalApproval)
            CompetencyReviewerUserId = reviewerUserId;
        if (status == QualificationStatus.Fail)
            EarliestReapplyAt = now + policy.ReapplyAfterFail;
        // A final result frees the reviewer; NEED_MORE_INFORMATION keeps them for the resubmission
        if (status != QualificationStatus.NeedMoreInformation)
        {
            ClaimedByUserId = null;
            ClaimedAt = null;
        }
        var decided = MoveTo(status, reviewerUserId, note, now);
        var assessments = cleaned
            .Select(x => CompetencyAssessment.Record(decided, x, reviewerUserId))
            .ToArray();
        return new(decided, assessments);
    }

    /// <summary>
    /// Final approval by a System Admin (state model 4.2, rows 6–7): a governance check of the Gate 2
    /// result, not a new assessment (BR-E10). APPROVE grants the service; RETURN_FOR_REVIEW sends it back
    /// to competency review with a note and clears the Gate 2 result. The approver must differ from the
    /// Gate 2 reviewer (BR-E33) and from the expert.
    /// </summary>
    public QualificationEvent DecideFinalApproval(
        Guid approverUserId,
        Guid applicantUserId,
        string decision,
        string? note,
        DateTimeOffset now
    )
    {
        if (Status != QualificationStatus.PendingFinalApproval)
            throw ExpertErrors.QualificationNotPendingApproval(Status);
        if (approverUserId == applicantUserId)
            throw ExpertErrors.SelfReviewNotAllowed();
        if (approverUserId == CompetencyReviewerUserId)
            throw ExpertErrors.FinalApproverIsReviewer();
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        switch (decision)
        {
            case FinalApprovalDecision.Approve:
                return MoveTo(QualificationStatus.ApprovedForService, approverUserId, note, now);
            case FinalApprovalDecision.ReturnForReview:
                if (note == null)
                    throw ExpertErrors.FinalApprovalNoteRequired();
                DecidedAt = null;
                // Back to the reviewer who passed Gate 2, who knows the case; the hold restarts
                ClaimedByUserId = CompetencyReviewerUserId;
                ClaimedAt = CompetencyReviewerUserId != null ? now : null;
                CompetencyReviewerUserId = null;
                return MoveTo(QualificationStatus.CompetencyReview, approverUserId, note, now);
            default:
                throw ExpertErrors.InvalidFinalApprovalDecision();
        }
    }

    /// <summary>
    /// Suspends an approved service (note required) or reinstates a suspended one (state model 4.2,
    /// rows 8–9). Only this service is affected (BR-E25).
    /// </summary>
    public QualificationEvent ChangeServiceAccess(
        Guid adminUserId,
        string action,
        string? note,
        DateTimeOffset now
    )
    {
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        switch (action)
        {
            case ServiceAccessAction.Suspend:
                if (Status != QualificationStatus.ApprovedForService)
                    throw ExpertErrors.ServiceNotApproved(Status);
                if (note == null)
                    throw ExpertErrors.SuspensionNoteRequired();
                return MoveTo(QualificationStatus.Suspended, adminUserId, note, now);
            case ServiceAccessAction.Reinstate:
                if (Status != QualificationStatus.Suspended)
                    throw ExpertErrors.ServiceNotSuspended(Status);
                return MoveTo(QualificationStatus.ApprovedForService, adminUserId, note, now);
            default:
                throw ExpertErrors.InvalidServiceAccessAction();
        }
    }

    /// <summary>Turns new requests on (approved service only) or off (always allowed).</summary>
    public void SetAcceptingRequests(bool accepting, DateTimeOffset now)
    {
        if (accepting && Status != QualificationStatus.ApprovedForService)
            throw ExpertErrors.ServiceNotApproved(Status);
        AcceptingRequests = accepting;
        UpdatedAt = now;
    }

    private QualificationEvent MoveTo(
        string status,
        Guid actorUserId,
        string? note,
        DateTimeOffset now
    )
    {
        var recorded = QualificationEvent.Record(Id, actorUserId, Status, status, note, now);
        Status = status;
        UpdatedAt = now;
        return recorded;
    }
}
