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
    /// <summary>Most cases one expert may run at once.</summary>
    public const int MaxCapacity = 20;

    /// <summary>Cases needed before the VERIFIED rate counts for ranking.</summary>
    public const int MinCasesForRate = 5;

    /// <summary>VERIFIED rate (percent) that puts an expert in the top ranking tier.</summary>
    public const int VerifiedTargetPercent = 80;

    /// <summary>Longest delivery promise an expert may give (30 days).</summary>
    public const int MaxTurnaroundHours = 720;

    private ExpertProfile() { }

    public Guid Id { get; } = UuidV7.NewGuid();

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
    public string ServiceStatus { get; private set; } = ExpertServiceStatus.Inactive;

    /// <summary>How many cases the expert works on at once (0 until the expert sets it).</summary>
    public int Capacity { get; private set; }

    /// <summary>Cases currently holding one of the expert's slots (changed by the case flow, not by the expert).</summary>
    public int ActiveCases { get; }

    /// <summary>Cases delivered so far (updated by the case flow on delivery).</summary>
    public int DeliveredCount { get; }

    /// <summary>Delivered cases whose result was VERIFIED.</summary>
    public int VerifiedCount { get; }

    public string? EligibilityNote { get; }
    public int? TurnaroundHours { get; private set; }
    public decimal RatingAvg { get; }
    public int RatingCount { get; }
    public Guid? ApprovedBy { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public ICollection<ExpertApplication> Applications { get; } = [];
    public ICollection<ServiceOffering> ServiceOfferings { get; } = [];
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; } = [];

    /// <summary>A new profile for the account, created on its first application.</summary>
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

    public bool IsApproved => Status == ExpertApplicationStatus.Approved;

    /// <summary>Turns taking new cases on or off and sets how many run at once; running cases are untouched.</summary>
    public void SetAvailability(
        bool accepting,
        int capacity,
        int activeOfferings,
        DateTimeOffset now
    )
    {
        if (capacity < 1 || capacity > MaxCapacity)
            throw ExpertErrors.CapacityInvalid(MaxCapacity);
        // Pausing is always allowed; taking cases needs something to sell and a delivery promise
        if (accepting && (activeOfferings == 0 || TurnaroundHours is null))
            throw ExpertErrors.NotReadyToAccept();
        ServiceStatus = accepting ? ExpertServiceStatus.Active : ExpertServiceStatus.Inactive;
        Capacity = capacity;
        UpdatedAt = now;
    }

    /// <summary>Hours the expert promises from starting a review to delivering it (sets the case deadline).</summary>
    public void SetTurnaroundHours(int hours, DateTimeOffset now)
    {
        if (hours < 1 || hours > MaxTurnaroundHours)
            throw ExpertErrors.TurnaroundInvalid(MaxTurnaroundHours);
        TurnaroundHours = hours;
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
