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
    IServiceCatalogRepository catalog
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
                    qualification.CanRemove(x)
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
            qualification.NeedsInformation && added < ApplicationRules.MaxFilesPerApplication,
            qualification.NeedsInformation && applicant.EmailVerified,
            ApplicationRules.MaxFilesPerApplication
        );
    }
}
