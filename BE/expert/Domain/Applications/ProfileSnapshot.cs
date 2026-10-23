using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Applications;

/// <summary>
/// Everything the applicant declared, copied at each submission (first submit or supplement) and never changed
/// afterwards, so reviewers and admins always see what was submitted rather than the profile as edited since.
/// </summary>
public sealed record ProfileSnapshot(
    string? DisplayName,
    string? Phone,
    DateOnly? BirthDate,
    string? Title,
    string? Company,
    string? Location,
    string? Bio,
    int? YearsExperience,
    string[] Fields,
    string? Highlights,
    string? ContactEmail,
    Declaration[] Declarations
)
{
    public static ProfileSnapshot Of(
        ExpertProfile profile,
        string? contactEmail,
        IReadOnlyList<Declaration> declarations
    ) =>
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
            profile.Highlights,
            contactEmail,
            declarations.ToArray()
        );

    /// <summary>True when the declared details are the same (statements and email are not compared).</summary>
    public bool HasSameDetails(ExpertProfile profile) =>
        DisplayName == profile.DisplayName
        && Phone == profile.Phone
        && BirthDate == profile.BirthDate
        && Title == profile.Title
        && Company == profile.Company
        && Location == profile.Location
        && Bio == profile.Bio
        && YearsExperience == profile.YearsExperience
        && Fields.SequenceEqual(profile.Fields)
        && Highlights == profile.Highlights;
}
