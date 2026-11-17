using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Common;

/// <summary>Combines the application, profile, files, history and Gate 1 results for reviewers.</summary>
public sealed class ReviewDescriber(
    IExpertApplicationRepository applications,
    IExpertEvidenceRepository evidences,
    IEligibilityCheckRepository eligibility,
    IScreeningRepository screeningRepo,
    IScreeningCoordinator screeningCoordinator,
    IExpertPolicyProvider policies,
    ExpertPolicyOptions options,
    IReviewClaimDescriber claims,
    TimeProvider clock
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
        var hold = (await policies.GetReviewClaimAsync(ct)).Hold;
        var work = await policies.GetReviewWorkAsync(ct);
        var now = clock.GetUtcNow();
        var claim = await claims.DescribeAsync(
            ReviewGate.Eligibility,
            application.Id,
            application.ClaimHolder(now, hold),
            application.ClaimedAt,
            application.ClaimExpiresAt(hold),
            application.IsClaimable,
            profile.UserId,
            ct
        );
        var screening = await DescribeScreeningAsync(application.Id, files, now, ct);
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
                    x.ActorUserId == profile.UserId,
                    x.ActorUserId == SystemActor.UserId
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
            snapshot != null ? options.Submission.CriteriaProvenBy(snapshot.Declarations) : [],
            claim,
            CompetencySubmissions.Rounds(
                history.Select(x => (x.FromStatus, x.ToStatus)),
                work.MaxInformationRequests,
                ExpertApplicationStatus.NeedMoreInformation
            ),
            screening
        );
    }

    private async Task<ReviewScreeningResponse?> DescribeScreeningAsync(
        Guid applicationId,
        IReadOnlyList<ExpertEvidence> files,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var run = await screeningRepo.FindLatestRunAsync(applicationId, ct);
        if (run == null)
            return null;

        var points = await screeningRepo.ListPointsAsync(run.Id, ct);
        var events = await screeningRepo.ListEventsAsync(applicationId, ct);
        var screeningPolicy = await policies.GetScreeningAsync(ct);
        var byEvidenceId = files.ToDictionary(x => x.Id);
        var today = DateOnly.FromDateTime(now.ToOffset(TimeSpan.FromHours(7)).DateTime);

        var pointResponses = points
            .Select(p =>
            {
                ExpertEvidence? ev =
                    p.EvidenceId.HasValue
                    && byEvidenceId.TryGetValue(p.EvidenceId.Value, out var found)
                        ? found
                        : null;
                return new ReviewScreeningPointResponse(
                    p.Id.ToString(),
                    p.Source,
                    p.Code,
                    p.EvidenceId?.ToString(),
                    ev?.EvidenceType,
                    ev?.FileName,
                    p.TargetCriterion,
                    p.Title,
                    p.Detail,
                    p.SuggestedRequest,
                    p.Status,
                    p.ResolutionReason,
                    p.ResolvedByUserId?.ToString(),
                    p.ResolvedAt,
                    p.CreatedAt
                );
            })
            .ToArray();

        // EV-01 identity documents and external links are never extracted by AI (Section 5).
        var extractionResponses = files
            .Where(x => x.RequiresAiExtraction)
            .Select(ev =>
            {
                var parsed = screeningCoordinator.ParseExtraction(ev.ParsedMeta);
                var derivedYears =
                    ev.EvidenceType == ApplicationRules.CvCode
                    && parsed?.WorkMilestones is { Length: > 0 } milestones
                    && milestones.Any(m => m.StartYear.HasValue)
                        ? ScreeningEvaluator.ComputeTaxAccountingYears(milestones, today)
                        : (double?)null;

                return new ReviewScreeningExtractionResponse(
                    ev.Id.ToString(),
                    ev.EvidenceType,
                    ev.FileName,
                    ev.AssignedGroup,
                    ev.ExtractionStatus ?? ExtractionStatuses.Pending,
                    parsed?.IsImage
                        ?? ev.ContentType
                            is Caps.Common.Domain.FileSignature.Jpeg
                                or Caps.Common.Domain.FileSignature.Png,
                    parsed?.IsScanned ?? false,
                    parsed?.IsUnreadable ?? false,
                    parsed?.UnreadableReason,
                    parsed?.FullName,
                    parsed?.DocumentType,
                    parsed?.FieldCodes ?? [],
                    derivedYears,
                    parsed
                        ?.WorkMilestones.Select(m => new ReviewScreeningMilestoneResponse(
                            m.Company,
                            m.Role,
                            m.StartYear,
                            m.StartMonth,
                            m.EndYear,
                            m.EndMonth,
                            m.IsCurrent,
                            m.IsTaxAccounting
                        ))
                        .ToArray()
                        ?? [],
                    parsed
                        ?.Certificates.Select(c => new ReviewScreeningCertificateResponse(
                            c.Name,
                            c.Issuer,
                            c.IssuedDate,
                            c.ExpiryDate
                        ))
                        .ToArray()
                        ?? [],
                    ev.ExtractedAt
                );
            })
            .ToArray();

        var historyResponses = events
            .Select(e => new ReviewScreeningHistoryResponse(
                e.Id.ToString(),
                e.EventType,
                e.Message,
                e.ActorUserId.ToString(),
                e.BySystem,
                e.CreatedAt
            ))
            .ToArray();

        return new ReviewScreeningResponse(
            run.Id.ToString(),
            run.SubmissionNumber,
            run.RunNumber,
            run.Status,
            run.StartedAt,
            run.TimeoutAt,
            run.CompletedAt,
            run.FailureReason,
            run.CheckedFileCount,
            points.Count(p => p.IsOpen),
            run.CanRetry,
            screeningPolicy.VisionEnabled,
            pointResponses,
            extractionResponses,
            historyResponses
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
