using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the application, profile, files, history and Gate 1 results for reviewers.</summary>
public sealed class ReviewDescriber(
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IEligibilityCheckRepository eligibility,
    IExpertPolicyProvider policies,
    ExpertPolicyOptions options
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
        // Reviewers judge what was submitted, not the profile as edited since (snapshot of the latest submission)
        var snapshot = ExpertApplicationEvent.LatestSnapshot(history);
        var years = snapshot != null ? snapshot.YearsExperience : profile.YearsExperience;
        var policy = await policies.GetEligibilityAsync(ct);
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
                    x.ActorUserId == profile.UserId
                ))
                .ToArray(),
            checks
                .Select(x => new EligibilityCheckResponse(
                    x.Criterion,
                    x.Result,
                    x.Note,
                    x.CreatedAt,
                    x.AppliedMinYearsExperience
                ))
                .ToArray(),
            policy.MinYearsExperience,
            EligibilityRules.SuggestExperience(years, policy),
            application.Status == ExpertApplicationStatus.Submitted,
            SnapshotProfiles.Submissions(history),
            policy.NotApplicableCriteria ?? [],
            CriterionDeclarations(history, options.Submission),
            snapshot != null ? options.Submission.CriteriaProvenBy(snapshot.Declarations) : []
        );
    }

    /// <summary>
    /// Statements of the latest submission under each criterion they support. The mapping comes from the
    /// current configuration by statement code, so statements stored before it existed still resolve.
    /// </summary>
    private static CriterionDeclarationResponse[] CriterionDeclarations(
        IEnumerable<ExpertApplicationEvent> history,
        SubmissionPolicy submission
    )
    {
        var latest = history
            .Where(x => x.ProfileSnapshot != null)
            .OrderBy(x => x.CreatedAt)
            .LastOrDefault();
        if (latest == null)
            return [];
        return EligibilityCriteria
            .Codes.SelectMany(criterion =>
            {
                var codes = submission.DeclarationCodesFor(criterion);
                return latest
                    .ProfileSnapshot!.Declarations.Where(d => codes.Contains(d.Code))
                    .Select(d => new CriterionDeclarationResponse(
                        criterion,
                        d.Code,
                        d.Language,
                        d.Text,
                        latest.CreatedAt,
                        latest.ActorUserId.ToString()
                    ));
            })
            .ToArray();
    }
}
