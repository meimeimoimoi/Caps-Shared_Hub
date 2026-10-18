using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the application, profile, files and history, and works out the allowed actions.</summary>
public sealed class ApplicationDescriber(
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IEligibilityCheckRepository eligibility
) : IApplicationDescriber
{
    public async Task<ExpertApplicationResponse> DescribeAsync(
        Applicant applicant,
        ExpertProfile profile,
        ExpertApplication application,
        CancellationToken ct
    )
    {
        var files = await evidences.ListAsync(application.Id, ct);
        var history = await applications.ListEventsAsync(application.Id, ct);
        var checks = await eligibility.ListLatestAsync(application.Id, ct);
        var missing = profile.MissingRequirements(
            files.Any(x => x.EvidenceType == ApplicationRules.CvCode)
        );
        var verified = applicant.EmailVerified;
        var maxFiles = verified
            ? ApplicationRules.MaxFilesPerApplication
            : ApplicationRules.MaxFilesBeforeVerification;
        return new(
            application.Id.ToString(),
            application.Status,
            application.SubmittedAt,
            application.DecidedAt,
            application.DecisionNote,
            application.EarliestReapplyAt,
            application.CreatedAt,
            application.UpdatedAt,
            new(
                profile.DisplayName ?? applicant.DefaultName,
                applicant.Email,
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
                .Select(x => new ExpertEvidenceResponse(
                    x.Id.ToString(),
                    x.EvidenceType,
                    x.FileName,
                    x.ContentType,
                    x.SizeBytes,
                    x.CreatedAt,
                    application.CanRemove(x)
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
            checks
                .Select(x => new EligibilityCheckResponse(
                    x.Criterion,
                    x.Result,
                    x.Note,
                    x.CreatedAt
                ))
                .ToArray(),
            missing,
            verified,
            application.CanEdit,
            application.AcceptsFiles && files.Count < maxFiles,
            application.CanEdit && verified && missing.Length == 0,
            application.NeedsInformation && verified,
            maxFiles
        );
    }
}
