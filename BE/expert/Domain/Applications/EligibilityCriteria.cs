namespace Caps.Expert.Domain.Applications;

/// <summary>Gate 1 eligibility requirements EV-01…EV-06 (POL-EXP-01) and the results a reviewer can give.</summary>
public static class EligibilityCriteria
{
    /// <summary>EV-01: legal capacity / residence where the framework requires it.</summary>
    public const string LegalEligibility = "EV-01";

    /// <summary>EV-02: tax professional qualification or certificate.</summary>
    public const string ProfessionalQualification = "EV-02";

    /// <summary>EV-03: continuing professional education.</summary>
    public const string ContinuingEducation = "EV-03";

    /// <summary>EV-04: professional ethics.</summary>
    public const string ProfessionalEthics = "EV-04";

    /// <summary>EV-05: confidentiality of user and taxpayer data.</summary>
    public const string Confidentiality = "EV-05";

    /// <summary>EV-06: years of tax/accounting experience, checked against the declared years (BR-E11).</summary>
    public const string TaxAccountingExperience = "EV-06";

    /// <summary>Same as <see cref="TaxAccountingExperience"/>; kept for existing callers.</summary>
    public const string ExperienceCode = TaxAccountingExperience;

    /// <summary>Every requirement, in display order; EV-01…EV-05 share their code with the evidence groups.</summary>
    public static readonly string[] Codes =
    [
        LegalEligibility,
        ProfessionalQualification,
        ContinuingEducation,
        ProfessionalEthics,
        Confidentiality,
        TaxAccountingExperience,
    ];

    public const string Pass = "PASS";
    public const string Fail = "FAIL";
    public const string NeedMoreInformation = "NEED_MORE_INFORMATION";

    /// <summary>The framework does not require this criterion; allowed only where the policy says so, with a reason.</summary>
    public const string NotApplicable = "NOT_APPLICABLE";

    public static readonly string[] Results = [Pass, Fail, NeedMoreInformation, NotApplicable];

    /// <summary>True for results the applicant must act on (FAIL, NEED_MORE_INFORMATION).</summary>
    public static bool IsIssue(string result) => result is Fail or NeedMoreInformation;
}

/// <summary>The reviewer's result for one requirement; the note is required unless it passed.</summary>
public sealed record CriterionResult(string Code, string Result, string? Note);
