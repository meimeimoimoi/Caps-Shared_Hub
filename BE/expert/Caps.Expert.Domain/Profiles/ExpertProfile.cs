using Caps.Common.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Domain.Profiles;

/// <summary>Applicant details as entered in the application form.</summary>
public sealed record ProfileDetails(
    string? DisplayName,
    string? Phone,
    DateOnly? BirthDate,
    string? Title,
    string? Company,
    string? Location,
    string? Bio,
    int? YearsExperience,
    string[] Fields,
    string? Highlights
);

/// <summary>
/// An expert (or applicant) owned by the expert service. Name and phone are the details given in the
/// application, kept here so this service never reads or writes the identity database.
/// </summary>
public sealed class ExpertProfile
{
    private ExpertProfile() { }

    public Guid Id { get; private set; } = UuidV7.NewGuid();

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid UserId { get; private set; }
    public string? DisplayName { get; private set; }
    public string? Phone { get; private set; }
    public int? YearsExperience { get; private set; }
    public string? Bio { get; private set; }
    public string? Title { get; private set; }
    public string? Company { get; private set; }
    public string? Location { get; private set; }
    public DateOnly? BirthDate { get; private set; }

    /// <summary>Expertise fields chosen by the applicant (fixed codes, see ApplicationRules).</summary>
    public string[] Fields { get; private set; } = [];
    public string? Highlights { get; private set; }

    /// <summary>Mirrors the latest application status for expert-level filtering/display.</summary>
    public string Status { get; private set; } = ExpertApplicationStatus.Draft;
    public string ServiceStatus { get; private set; } = "INACTIVE";
    public string? EligibilityNote { get; private set; }
    public int? TurnaroundHours { get; private set; }
    public decimal RatingAvg { get; private set; }
    public int RatingCount { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public ICollection<ExpertApplication> Applications { get; private set; } =
        new List<ExpertApplication>();
    public ICollection<ServiceOffering> ServiceOfferings { get; private set; } =
        new List<ServiceOffering>();
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; private set; } =
        new List<AvailabilitySlot>();

    /// <param name="defaultName">Shown until the applicant saves a name (e.g. the email's local part).</param>
    public static ExpertProfile Create(Guid userId, string defaultName, DateTimeOffset now) =>
        new()
        {
            UserId = userId,
            DisplayName = defaultName,
            CreatedAt = now,
            UpdatedAt = now,
        };

    /// <summary>Draft save: a blank name keeps the current one, a blank phone clears it.</summary>
    public void UpdateDetails(ProfileDetails details, DateTimeOffset now)
    {
        if (!string.IsNullOrWhiteSpace(details.DisplayName))
            DisplayName = details.DisplayName.Trim();
        Phone = Clean(details.Phone);
        BirthDate = details.BirthDate;
        Title = Clean(details.Title);
        Company = Clean(details.Company);
        Location = Clean(details.Location);
        Bio = Clean(details.Bio);
        YearsExperience = details.YearsExperience;
        Fields = details.Fields;
        Highlights = Clean(details.Highlights);
        UpdatedAt = now;
    }

    public void MirrorStatus(string status, DateTimeOffset now)
    {
        Status = status;
        UpdatedAt = now;
    }

    /// <summary>What is still needed before the application can be submitted.</summary>
    public string[] MissingRequirements(bool hasCv)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(Phone))
            missing.Add("phone");
        if (YearsExperience == null)
            missing.Add("yearsExperience");
        if (Fields.Length == 0)
            missing.Add("fields");
        if (!hasCv)
            missing.Add(ApplicationRules.CvCode);
        return missing.ToArray();
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
