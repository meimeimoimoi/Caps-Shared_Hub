using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Common;

/// <summary>Material change check for an application that follows a NOT_ELIGIBLE one (POL-EXP-REAPP).</summary>
public interface IReapplicationChecker
{
    /// <summary>
    /// Criteria that failed in the previous application and still lack updated information or new evidence;
    /// empty when the application is not a re-application after NOT_ELIGIBLE.
    /// </summary>
    /// <param name="evidenceCodes">Evidence groups holding a file or link in the application.</param>
    Task<string[]> MissingChangesAsync(
        ExpertApplication application,
        ExpertProfile profile,
        IReadOnlyCollection<string> evidenceCodes,
        CancellationToken ct
    );
}
