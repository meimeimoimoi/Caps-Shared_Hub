using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>
/// The applicant details reviewers see: the snapshot of the latest submission when there is one, otherwise the
/// profile as it is now (drafts, and applications submitted before snapshots existed).
/// </summary>
public static class SnapshotProfiles
{
    public static ReviewApplicantProfile ToReviewProfile(
        ProfileSnapshot? snapshot,
        ExpertProfile profile
    ) =>
        snapshot is { } s
            ? new(
                s.DisplayName,
                s.Phone,
                s.BirthDate,
                s.Title,
                s.Company,
                s.Location,
                s.Bio,
                s.YearsExperience,
                s.Fields,
                s.Highlights
            )
            : new(
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
            );

    /// <summary>Every submission of the application, first one first, with the statements agreed to.</summary>
    public static ReviewSubmissionResponse[] Submissions(
        IEnumerable<ExpertApplicationEvent> history
    ) =>
        history
            .Where(x => x.ProfileSnapshot != null)
            .OrderBy(x => x.CreatedAt)
            .Select(
                (x, i) =>
                    new ReviewSubmissionResponse(
                        i + 1,
                        x.CreatedAt,
                        x.ProfileSnapshot!.Declarations.Select(d => new DeclarationResponse(
                                d.Code,
                                d.Language,
                                d.Text
                            ))
                            .ToArray()
                    )
            )
            .ToArray();
}
