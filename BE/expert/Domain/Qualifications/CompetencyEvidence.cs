namespace Caps.Expert.Domain.Qualifications;

/// <summary>
/// One competency a qualification file supports. A file can support several competencies; reviewers see each
/// file under the competencies the expert tied it to.
/// </summary>
public sealed class CompetencyEvidenceLink
{
    private CompetencyEvidenceLink() { }

    public Guid QualificationId { get; private set; }
    public Guid EvidenceId { get; private set; }

    /// <summary>Competency code C1…C5 (data only; screens show the full name).</summary>
    public string Competency { get; private set; } = default!;
    public DateTimeOffset CreatedAt { get; private set; }

    public static CompetencyEvidenceLink Create(
        Guid qualificationId,
        Guid evidenceId,
        string competency,
        DateTimeOffset now
    ) =>
        new()
        {
            QualificationId = qualificationId,
            EvidenceId = evidenceId,
            Competency = competency,
            CreatedAt = now,
        };
}

/// <summary>The expert's short explanation of what the files show for one competency (optional).</summary>
public sealed class CompetencyDescription
{
    private CompetencyDescription() { }

    public Guid QualificationId { get; private set; }
    public string Competency { get; private set; } = default!;
    public string Text { get; private set; } = default!;
    public DateTimeOffset UpdatedAt { get; private set; }

    public static CompetencyDescription Create(
        Guid qualificationId,
        string competency,
        string text,
        DateTimeOffset now
    ) =>
        new()
        {
            QualificationId = qualificationId,
            Competency = competency,
            Text = text,
            UpdatedAt = now,
        };

    public void Change(string text, DateTimeOffset now)
    {
        Text = text;
        UpdatedAt = now;
    }
}

/// <summary>Rules for tying files to competencies and describing them (E3–E7).</summary>
public static class CompetencyEvidenceRules
{
    public const int MaxDescriptionLength = 1000;

    /// <summary>Known competency codes, upper-cased and without repeats; at least one is required.</summary>
    public static string[] CleanCodes(IEnumerable<string>? codes)
    {
        var cleaned = (codes ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToArray();
        if (cleaned.Length == 0)
            throw ExpertErrors.EvidenceCompetencyRequired();
        if (cleaned.Any(x => !CompetencyCriteria.Codes.Contains(x)))
            throw ExpertErrors.InvalidCompetencyCode();
        return cleaned.OrderBy(x => Array.IndexOf(CompetencyCriteria.Codes, x)).ToArray();
    }

    /// <summary>A known competency code, upper-cased.</summary>
    public static string CleanCode(string? code)
    {
        var cleaned = code?.Trim().ToUpperInvariant() ?? "";
        if (!CompetencyCriteria.Codes.Contains(cleaned))
            throw ExpertErrors.InvalidCompetencyCode();
        return cleaned;
    }

    /// <summary>The trimmed description, or null to clear it.</summary>
    public static string? CleanDescription(string? text)
    {
        text = text?.Trim();
        if (string.IsNullOrEmpty(text))
            return null;
        if (text.Length > MaxDescriptionLength)
            throw ExpertErrors.CompetencyDescriptionTooLong(MaxDescriptionLength);
        return text;
    }

    /// <summary>
    /// E7: a re-registration after FAIL needs at least one new file tied to each competency that failed. Every
    /// file of the re-registration is new, so any link of it counts.
    /// </summary>
    /// <returns>The failed competencies still without a file, in display order.</returns>
    public static string[] MissingNewEvidence(
        IEnumerable<string> failedCompetencies,
        IEnumerable<CompetencyEvidenceLink> links
    )
    {
        var covered = links.Select(x => x.Competency).ToHashSet();
        return failedCompetencies
            .Distinct()
            .Where(x => !covered.Contains(x))
            .OrderBy(x => Array.IndexOf(CompetencyCriteria.Codes, x))
            .ToArray();
    }
}
