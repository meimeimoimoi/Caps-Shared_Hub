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
            qualification.Status,
            qualification.SubmittedAt,
            qualification.DecidedAt,
            qualification.DecisionNote,
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
                .Select(x => new ExpertApplicationEventResponse(
                    x.FromStatus,
                    x.ToStatus,
                    x.Note,
                    x.CreatedAt,
                    x.ActorUserId == applicant.UserId
                ))
                .ToArray(),
            CompetencyResults.ToResponses(results),
            qualification.AcceptsEvidence && added < ApplicationRules.MaxFilesPerApplication,
            qualification.NeedsInformation && applicant.EmailVerified,
            ApplicationRules.MaxFilesPerApplication,
            qualification.AwaitsNewEvidence,
            qualification.IsPreparing && applicant.EmailVerified && links.Count > 0,
            CompetencySubmissions.ToResponses(links, descriptions),
            newEvidenceRequired,
            CompetencySubmissions.Rounds(
                history.Select(x => (x.FromStatus, x.ToStatus)),
                work.MaxInformationRequests,
                QualificationStatus.NeedMoreInformation
            )
        );
    }
}
