using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the qualification, profile, files, history, Gate 1 and Gate 2 results for reviewers.</summary>
public sealed class QualificationReviewDescriber(
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository evidences,
    IEligibilityCheckRepository eligibility,
    ICompetencyAssessmentRepository assessments,
    IServiceCatalogRepository catalog
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
            new(
                profile.DisplayName,
                profile.Phone,
                profile.BirthDate,
                profile.Title,
                profile.Company,
                profile.Location,
                profile.Bio,
                profile.YearsExperience,
                profile.Fields,
                profile.Highlights
            ),
            files
                .Select(x => new ReviewEvidenceResponse(
                    x.Id.ToString(),
                    x.EvidenceType,
                    x.FileName,
                    x.ContentType,
                    x.SizeBytes,
                    x.CreatedAt
                ))
                .ToArray(),
            history
                .Select(x => new ReviewEventResponse(
                    x.FromStatus,
                    x.ToStatus,
                    x.Note,
                    x.CreatedAt,
                    x.ActorUserId.ToString(),
                    x.ActorUserId == profile.UserId
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
            qualification.Status == QualificationStatus.Suspended
        );
    }
}
