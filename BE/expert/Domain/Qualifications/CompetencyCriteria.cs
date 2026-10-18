namespace Caps.Expert.Domain.Qualifications;

/// <summary>Gate 2 competencies C1–C5 (POL-EXP-02, BR-E34) and the results a reviewer can give.</summary>
public static class CompetencyCriteria
{
    /// <summary>Every competency, in display order.</summary>
    public static readonly string[] Codes = ["C1", "C2", "C3", "C4", "C5"];

    public const string Pass = "PASS";
    public const string Fail = "FAIL";
    public const string NeedMoreInformation = "NEED_MORE_INFORMATION";

    public static readonly string[] Results = [Pass, Fail, NeedMoreInformation];
}

/// <summary>The reviewer's result for one competency (BR-E09, BR-E36).</summary>
/// <param name="Note">Assessment note; required for every competency.</param>
/// <param name="EvidenceIds">Files the result relies on; required unless more information is requested.</param>
public sealed record CompetencyResult(
    string Code,
    string Result,
    string? Note,
    IReadOnlyList<Guid> EvidenceIds
);
