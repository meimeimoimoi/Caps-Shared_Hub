using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Compares the new application with the latest submission and FAIL results of the previous one.</summary>
public sealed class ReapplicationChecker(
    IExpertApplicationRepository applications,
    IEligibilityCheckRepository eligibility
) : IReapplicationChecker
{
    public async Task<string[]> MissingChangesAsync(
        ExpertApplication application,
        ExpertProfile profile,
        IReadOnlyCollection<string> evidenceCodes,
        CancellationToken ct
    )
    {
        // Only a draft that follows a closed application can be a re-application; a supplement is not one
        if (!application.CanEdit || application.PreviousApplicationId is not { } previousId)
            return [];
        var failed = (await eligibility.ListLatestAsync(previousId, ct))
            .Where(x => x.Result == EligibilityCriteria.Fail)
            .Select(x => x.Criterion)
            .ToArray();
        if (failed.Length == 0)
            return [];
        var previous = ExpertApplicationEvent.LatestSnapshot(
            await applications.ListEventsAsync(previousId, ct)
        );
        return ReapplicationRules.MissingChanges(failed, previous, profile, evidenceCodes);
    }
}
