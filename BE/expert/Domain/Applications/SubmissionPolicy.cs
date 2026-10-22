namespace Caps.Expert.Domain.Applications;

/// <summary>
/// What an application needs before it can be submitted (BR-E02): the evidence groups that must hold a file or
/// link, and the statements the applicant must agree to, in every supported language.
/// </summary>
public sealed record SubmissionPolicy(string[] RequiredEvidenceCodes, Declaration[] Declarations)
{
    private const string DefaultLanguage = "vi";

    /// <summary>Codes of the statements every submission must include.</summary>
    public string[] RequiredDeclarationCodes =>
        Declarations.Select(x => x.Code).Distinct().ToArray();

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
