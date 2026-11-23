namespace Caps.Expert.Domain.Applications;

/// <summary>
/// What an application needs before it can be submitted (BR-E02): the evidence groups that must hold a file or
/// link, and the statements the applicant must agree to, in every supported language.
/// </summary>
/// <param name="DeclarationCriteria">
/// Eligibility criteria each statement supports, by statement code (PROFESSIONAL_CONDUCT → EV-04, EV-05).
/// Kept apart from the wording so statements stored before the mapping existed still resolve by code.
/// </param>
public sealed record SubmissionPolicy(
    string[] RequiredEvidenceCodes,
    Declaration[] Declarations,
    IReadOnlyDictionary<string, string[]>? DeclarationCriteria = null
)
{
    private const string DefaultLanguage = "vi";

    /// <summary>Codes of the statements every submission must include.</summary>
    public string[] RequiredDeclarationCodes =>
        Declarations.Select(x => x.Code).Distinct().ToArray();

    /// <summary>Codes of the statements that support the criterion; empty when none does.</summary>
    public string[] DeclarationCodesFor(string criterion) =>
        (DeclarationCriteria ?? new Dictionary<string, string[]>())
            .Where(x => x.Value.Contains(criterion))
            .Select(x => x.Key)
            .ToArray();

    /// <summary>
    /// Criteria met by the statements agreed to on a submission (EV-04, EV-05 by PROFESSIONAL_CONDUCT), in EV order.
    /// </summary>
    public string[] CriteriaProvenBy(IEnumerable<Declaration> agreed)
    {
        var codes = agreed.Select(x => x.Code).ToHashSet();
        return EligibilityCriteria
            .Codes.Where(criterion => DeclarationCodesFor(criterion).Any(codes.Contains))
            .ToArray();
    }

    /// <summary>
    /// The server's wording of every required statement in the given language (Vietnamese when unknown).
    /// Throws when the applicant did not agree to one of them; wording sent by a client is never used.
    /// </summary>
    public Declaration[] Resolve(IEnumerable<string>? agreedCodes, string? language)
    {
        var agreed = (agreedCodes ?? []).Select(x => x.Trim()).ToHashSet();
        var missing = RequiredDeclarationCodes.FirstOrDefault(x => !agreed.Contains(x));
        if (missing != null)
            throw ExpertErrors.DeclarationRequired(missing);
        var wanted = Declarations.Any(x => x.Language == language) ? language : DefaultLanguage;
        return RequiredDeclarationCodes
            .Select(code =>
                Declarations.FirstOrDefault(x => x.Code == code && x.Language == wanted)
                ?? Declarations.First(x => x.Code == code)
            )
            .ToArray();
    }
}
