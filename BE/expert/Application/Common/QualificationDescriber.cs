using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the qualification, its files, history and Gate 2 results, and works out the allowed actions.</summary>
public sealed class QualificationDescriber(
    IQualificationRepository qualifications,
    IQualificationEvidenceRepository evidences,
    ICompetencyAssessmentRepository assessments,
    IServiceCatalogRepository catalog,
    ICompetencyEvidenceRepository competencyEvidence,
    IExpertPolicyProvider policies
) : IQualificationDescriber
{
    public async Task<ExpertQualificationResponse> DescribeAsync(
        Applicant applicant,
        ExpertServiceQualification qualification,
        CancellationToken ct
    )
    {
        var files = await evidences.ListAsync(qualification, ct);
        var history = await qualifications.ListEventsAsync(qualification.Id, ct);
        var results = await assessments.ListLatestAsync(qualification.Id, ct);
        var service = await catalog.FindAsync(qualification.ServiceCode, ct);
        var added = files.Count(x => x.QualificationId == qualification.Id);
        var links = await competencyEvidence.ListLinksAsync(qualification.Id, ct);
        var descriptions = await competencyEvidence.ListDescriptionsAsync(qualification.Id, ct);
        var work = await policies.GetReviewWorkAsync(ct);
        // D4: waiting for final approval reads as competency review, and a Gate 2 PASS stays hidden until the
        // final result, so a return never shows the expert a step back
        var status = FinalApprovalRules.ExpertStatus(qualification.Status);
        var passHidden =
            status == QualificationStatus.CompetencyReview
            && results.Count > 0
            && results.All(x => x.Result == CompetencyCriteria.Pass);
        // D8: Gate 2 is expected within the review waiting time from the latest submission (or return), the
        // final approval within its due time from the Gate 2 PASS
        var finalApproval = await policies.GetFinalApprovalAsync(ct);
        var reviewStartedAt = history
            .Where(x => x.ToStatus == QualificationStatus.CompetencyReview)
            .Select(x => (DateTimeOffset?)x.CreatedAt)
            .Max();
        var expectedResultBy = qualification.Status switch
        {
            QualificationStatus.PendingFinalApproval
                when qualification.DecidedAt is DateTimeOffset passedAt => FinalApprovalRules.DueAt(
                passedAt,
                finalApproval
            ),
            QualificationStatus.CompetencyReview => reviewStartedAt?.AddDays(work.SlaDays),
            _ => (DateTimeOffset?)null,
        };
        // E7: a re-registration after FAIL names the failed competencies still without a new file
        string[] newEvidenceRequired = [];
        if (
            qualification.AwaitsNewEvidence
            && qualification.PreviousQualificationId is Guid previous
        )
        {
            var failed = (await assessments.ListLatestAsync(previous, ct))
                .Where(x => x.Result == CompetencyCriteria.Fail)
                .Select(x => x.Competency);
            newEvidenceRequired = CompetencyEvidenceRules.MissingNewEvidence(failed, links);
        }
        return new(
            qualification.Id.ToString(),
            qualification.ServiceCode,
            service?.Name ?? qualification.ServiceCode,
            status,
            qualification.SubmittedAt,
            passHidden ? null : qualification.DecidedAt,
            passHidden ? null : qualification.DecisionNote,
            qualification.EarliestReapplyAt,
            qualification.PreviousQualificationId?.ToString(),
            qualification.CreatedAt,
            files
                .Select(x => new ExpertEvidenceResponse(
                    x.Id.ToString(),
                    x.EvidenceType,
                    x.FileName,
                    x.ContentType,
                    x.SizeBytes,
                    x.CreatedAt,
                    qualification.CanRemove(x),
                    x.SourceUrl
                ))
                .ToArray(),
            history
                .Where(x => !FinalApprovalRules.IsInternal(x.FromStatus, x.ToStatus))
                .Select(x => new ExpertApplicationEventResponse(
                    x.FromStatus is string from ? FinalApprovalRules.ExpertStatus(from) : null,
                    x.ToStatus,
                    x.Note,
                    x.CreatedAt,
                    x.ActorUserId == applicant.UserId
                ))
                .ToArray(),
            passHidden ? [] : CompetencyResults.ToResponses(results),
            qualification.AcceptsEvidence && added < ApplicationRules.MaxFilesPerApplication,
            qualification.NeedsInformation && applicant.EmailVerified,
            ApplicationRules.MaxFilesPerApplication,
            qualification.AwaitsNewEvidence,
            qualification.IsPreparing && applicant.EmailVerified && links.Count > 0,
            CompetencySubmissions.ToResponses(links, descriptions),
            newEvidenceRequired,
            CompetencySubmissions.Rounds(
                history.Select(x => (x.FromStatus, x.ToStatus)),
                FinalApprovalRules.MaxInformationRequests(
                    work.MaxInformationRequests,
                    history.Select(x => (x.FromStatus, x.ToStatus))
                ),
                QualificationStatus.NeedMoreInformation
            ),
            expectedResultBy
        );
    }
}
