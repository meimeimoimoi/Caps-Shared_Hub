namespace Caps.Expert.Domain.Qualifications;

/// <summary>Policy values of Gate 2, kept in configuration rather than in code (BR-E29).</summary>
/// <param name="ReapplyAfterFail">Wait before registering the service again after FAIL: 90 days under the current policy.</param>
public sealed record CompetencyPolicy(TimeSpan ReapplyAfterFail);

/// <summary>The status change of a Gate 2 decision and the per-competency results stored with it.</summary>
public sealed record CompetencyDecision(
    QualificationEvent Event,
    IReadOnlyList<CompetencyAssessment> Assessments
);

/// <summary>Checks a reviewer's Gate 2 results and derives the outcome (POL-EXP-02, state model 4.2).</summary>
public static class CompetencyRules
{
    /// <summary>
    /// Requires exactly one known result for each of C1…C5 with a note (BR-E09). PASS and FAIL must cite at
    /// least one file of the qualification (BR-E36); NEED_MORE_INFORMATION may cite none, since the evidence
    /// is what is missing.
    /// </summary>
    /// <param name="evidenceIds">Files the reviewer may cite: the Gate 1 files and those added for this service.</param>
    /// <returns>The results in display order with trimmed notes and distinct evidence ids.</returns>
    public static IReadOnlyList<CompetencyResult> Validate(
        IReadOnlyCollection<CompetencyResult> results,
        IReadOnlySet<Guid> evidenceIds
    )
    {
        var byCode = new Dictionary<string, CompetencyResult>();
        foreach (var result in results)
        {
            var code = result.Code.Trim();
            if (!CompetencyCriteria.Codes.Contains(code) || !byCode.TryAdd(code, result))
                throw ExpertErrors.InvalidCompetencyCriteria();
            if (!CompetencyCriteria.Results.Contains(result.Result))
                throw ExpertErrors.InvalidCompetencyResult(code);
        }
        if (byCode.Count != CompetencyCriteria.Codes.Length)
            throw ExpertErrors.InvalidCompetencyCriteria();

        return CompetencyCriteria
            .Codes.Select(code =>
            {
                var result = byCode[code];
                var note = string.IsNullOrWhiteSpace(result.Note) ? null : result.Note.Trim();
                if (note == null)
                    throw ExpertErrors.CompetencyNoteRequired(code);
                var cited = (result.EvidenceIds ?? []).Distinct().ToArray();
                if (cited.Any(id => !evidenceIds.Contains(id)))
                    throw ExpertErrors.CompetencyEvidenceUnknown(code);
                if (cited.Length == 0 && result.Result != CompetencyCriteria.NeedMoreInformation)
                    throw ExpertErrors.CompetencyEvidenceRequired(code);
                return new CompetencyResult(code, result.Result, note, cited);
            })
            .ToArray();
    }

    /// <summary>Any FAIL → FAIL; otherwise any NEED_MORE_INFORMATION → NEED_MORE_INFORMATION; else PENDING_FINAL_APPROVAL.</summary>
    public static string Outcome(IEnumerable<CompetencyResult> results)
    {
        var values = results.Select(x => x.Result).ToArray();
        if (values.Contains(CompetencyCriteria.Fail))
            return QualificationStatus.Fail;
        return values.Contains(CompetencyCriteria.NeedMoreInformation)
            ? QualificationStatus.NeedMoreInformation
            : QualificationStatus.PendingFinalApproval;
    }
}
