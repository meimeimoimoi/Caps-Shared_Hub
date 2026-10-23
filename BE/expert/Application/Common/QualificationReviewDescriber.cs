using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the qualification, profile, files, history, Gate 1 and Gate 2 results for reviewers.</summary>
public sealed class QualificationReviewDescriber(
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository evidences,
    IEligibilityCheckRepository eligibility,
    ICompetencyAssessmentRepository assessments,
    IServiceCatalogRepository catalog,
    IExpertApplicationRepository applications,
    IExpertPolicyProvider policies,
    ICompetencyEvidenceRepository competencyEvidence,
    IReviewClaimDescriber claims,
    TimeProvider clock
) : IQualificationReviewDescriber
{
    public async Task<ReviewQualificationResponse> DescribeAsync(
        ExpertServiceQualification qualification,
        CancellationToken ct
    )
    {
        var profile = qualification.ExpertProfile;
        var files = await evidences.ListAsync(qualification, ct);
        var history = await qualifications.ListEventsAsync(qualification.Id, ct);
        var checks = await eligibility.ListLatestAsync(qualification.ApplicationId, ct);
        var results = await assessments.ListLatestAsync(qualification.Id, ct);
        var service = await catalog.FindAsync(qualification.ServiceCode, ct);
        // Gate 2 shows what was submitted in the eligible Gate 1 application, not later profile edits
        var snapshot = ExpertApplicationEvent.LatestSnapshot(
            await applications.ListEventsAsync(qualification.ApplicationId, ct)
        );
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        var work = await policies.GetReviewWorkAsync(ct);
        var finalApproval = await policies.GetFinalApprovalAsync(ct);
        var links = await competencyEvidence.ListLinksAsync(qualification.Id, ct);
        var descriptions = await competencyEvidence.ListDescriptionsAsync(qualification.Id, ct);
        var claim = await claims.DescribeAsync(
            ReviewGate.Competency,
            qualification.Id,
            qualification.ClaimHolder(clock.GetUtcNow(), hold),
            qualification.ClaimedAt,
            qualification.ClaimExpiresAt(hold),
            qualification.IsClaimable,
            profile.UserId,
            ct
        );
        return new(
            qualification.Id.ToString(),
            profile.UserId.ToString(),
            qualification.ServiceCode,
            service?.Name ?? qualification.ServiceCode,
            qualification.Status,
            qualification.SubmittedAt,
            qualification.DecidedAt,
            qualification.DecisionNote,
            qualification.EarliestReapplyAt,
            qualification.PreviousQualificationId?.ToString(),
            qualification.ApplicationId.ToString(),
            qualification.CreatedAt,
            SnapshotProfiles.ToReviewProfile(snapshot, profile),
            files
                .Select(x => new ReviewEvidenceResponse(
                    x.Id.ToString(),
                    x.EvidenceType,
                    x.FileName,
                    x.ContentType,
                    x.SizeBytes,
                    x.CreatedAt,
                    x.SourceUrl
                ))
                .ToArray(),
            history
                .Select(x => new ReviewEventResponse(
                    x.FromStatus,
                    x.ToStatus,
                    x.Note,
                    x.CreatedAt,
                    x.ActorUserId.ToString(),
                    x.ActorUserId == profile.UserId,
                    x.ActorUserId == SystemActor.UserId
                ))
                .ToArray(),
            checks
                .Select(x => new EligibilityCheckResponse(
                    x.Criterion,
                    x.Result,
                    x.Note,
                    x.CreatedAt
                ))
                .ToArray(),
            CompetencyResults.ToResponses(results),
            qualification.Status == QualificationStatus.CompetencyReview,
            qualification.CompetencyReviewerUserId?.ToString(),
            qualification.Status == QualificationStatus.PendingFinalApproval,
            qualification.Status == QualificationStatus.ApprovedForService,
            qualification.Status == QualificationStatus.Suspended,
            claim,
            CompetencySubmissions.ToResponses(links, descriptions),
            CompetencySubmissions.Rounds(
                history.Select(x => (x.FromStatus, x.ToStatus)),
                FinalApprovalRules.MaxInformationRequests(
                    work.MaxInformationRequests,
                    history.Select(x => (x.FromStatus, x.ToStatus))
                ),
                QualificationStatus.NeedMoreInformation
            ),
            qualification.Status == QualificationStatus.PendingFinalApproval
            && qualification.DecidedAt is DateTimeOffset passedAt
                ? FinalApprovalRules.DueAt(passedAt, finalApproval)
                : null
        );
    }
}
