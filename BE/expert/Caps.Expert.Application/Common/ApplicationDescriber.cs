using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

public interface IApplicationDescriber
{
    /// <summary>Builds the applicant's view: details, files, history and what can be done next.</summary>
    Task<ExpertApplicationResponse> DescribeAsync(
        Applicant applicant,
        ExpertProfile profile,
        ExpertApplication application,
        CancellationToken ct
    );
}

public sealed class ApplicationDescriber(
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences
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
        var missing = profile.MissingRequirements(
            files.Any(x => x.EvidenceType == ApplicationRules.CvCode)
        );
        var verified = applicant.EmailVerified;
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
            missing,
            verified,
            application.CanEdit,
            application.AcceptsFiles && files.Count < ApplicationRules.MaxFilesPerApplication,
            application.CanEdit && verified && missing.Length == 0,
            application.NeedsInformation && verified
        );
    }
}
