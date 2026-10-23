using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Domain.Applications;

/// <summary>
/// Material change before re-applying after NOT_ELIGIBLE (POL-EXP-REAPP): waiting out the interval is not
/// enough, each failed criterion needs updated information or new evidence.
/// </summary>
public static class ReapplicationRules
{
    /// <summary>
    /// The failed criteria still without a change, in EV order; empty means the submission may go ahead.
    /// EV-01…EV-05 are met by any change to the declared details or by a file or link in the criterion's
    /// evidence group; EV-06 only by a change to the declared years.
    /// </summary>
    /// <param name="failedCriteria">Criteria that FAILED in the previous application's decision.</param>
    /// <param name="previous">
    /// Snapshot of the previous application's latest submission. Applications submitted before snapshots
    /// existed have none; nothing can be compared then, so the details count as changed.
    /// </param>
    /// <param name="current">The profile as it will be submitted now.</param>
    /// <param name="evidenceCodes">Evidence groups holding a file or link in the new application.</param>
    public static string[] MissingChanges(
        IEnumerable<string> failedCriteria,
        ProfileSnapshot? previous,
        ExpertProfile current,
        IReadOnlyCollection<string> evidenceCodes
    )
    {
        if (previous == null)
            return [];
        var detailsChanged = !previous.HasSameDetails(current);
        var yearsChanged = previous.YearsExperience != current.YearsExperience;
        return failedCriteria
            .Distinct()
            .Where(code =>
                code == EligibilityCriteria.TaxAccountingExperience
                    ? !yearsChanged
                    : !detailsChanged && !evidenceCodes.Contains(code)
            )
            .OrderBy(code => Array.IndexOf(EligibilityCriteria.Codes, code))
            .ToArray();
    }
}
