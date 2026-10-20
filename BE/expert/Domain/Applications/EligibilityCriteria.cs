namespace Caps.Expert.Domain.Applications;

/// <summary>Gate 1 eligibility requirements EV-01…EV-06 (POL-EXP-01) and the results a reviewer can give.</summary>
public static class EligibilityCriteria
{
    /// <summary>EV-06: years of tax/accounting experience, checked against the declared years (BR-E11).</summary>
    public const string ExperienceCode = "EV-06";

    /// <summary>Every requirement, in display order; EV-01…EV-05 share their code with the evidence groups.</summary>
    public static readonly string[] Codes =
    [
        "EV-01",
        "EV-02",
        "EV-03",
        "EV-04",
        "EV-05",
        ExperienceCode,
    ];

    public const string Pass = "PASS";
    public const string Fail = "FAIL";
    public const string NeedMoreInformation = "NEED_MORE_INFORMATION";

    public static readonly string[] Results = [Pass, Fail, NeedMoreInformation];
}

/// <summary>The reviewer's result for one requirement; the note is required unless it passed.</summary>
public sealed record CriterionResult(string Code, string Result, string? Note);
