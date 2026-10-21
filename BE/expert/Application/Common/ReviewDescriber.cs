using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the application, profile, files, history and Gate 1 results for reviewers.</summary>
public sealed class ReviewDescriber(
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IEligibilityCheckRepository eligibility,
    ExpertPolicyOptions policy
) : IReviewDescriber
{
    public async Task<ReviewApplicationResponse> DescribeAsync(
        ExpertApplication application,
        CancellationToken ct
    )
    {
        var profile = application.ExpertProfile;
        var files = await evidences.ListAsync(application.Id, ct);
        var history = await applications.ListEventsAsync(application.Id, ct);
        var checks = await eligibility.ListLatestAsync(application.Id, ct);
        return new(
            application.Id.ToString(),
            profile.UserId.ToString(),
            application.Status,
            application.SubmittedAt,
            application.DecidedAt,
            application.DecisionNote,
            application.EarliestReapplyAt,
            application.PreviousApplicationId?.ToString(),
            application.CreatedAt,
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
            policy.MinYearsExperience,
            EligibilityRules.SuggestExperience(profile.YearsExperience, policy.Eligibility),
            application.Status == ExpertApplicationStatus.Submitted
        );
    }
}
