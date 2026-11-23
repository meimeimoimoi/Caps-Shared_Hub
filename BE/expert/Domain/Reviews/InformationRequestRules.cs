namespace Caps.Expert.Domain.Reviews;

/// <summary>
/// Caps the rounds of "more information needed" a review may ask for (Gate 1 and Gate 2, policy
/// MaxInformationRequests). Rounds are counted from the status history, so reviews already open when the
/// limit was introduced keep the rounds they had.
/// </summary>
public static class InformationRequestRules
{
    /// <summary>
    /// Rounds asked for so far: decisions that moved the review to NEED_MORE_INFORMATION. The opening event of a
    /// re-registration (no previous status) waits for new evidence and is not a round.
    /// </summary>
    /// <param name="needMoreInformation">The gate's own NEED_MORE_INFORMATION status constant.</param>
    public static int Count(
        IEnumerable<(string? FromStatus, string ToStatus)> history,
        string needMoreInformation
    ) => history.Count(x => x.FromStatus != null && x.ToStatus == needMoreInformation);

    /// <summary>True while one more round can still be asked for.</summary>
    public static bool CanRequest(int roundsSoFar, int maxRounds) => roundsSoFar < maxRounds;

    /// <summary>Throws when the decision asks for more information after the last allowed round.</summary>
    /// <param name="outcome">The status the decision leads to.</param>
    /// <param name="needMoreInformation">The gate's own NEED_MORE_INFORMATION status constant.</param>
    public static void EnsureAllowed(
        string outcome,
        int roundsSoFar,
        int maxRounds,
        string needMoreInformation
    )
    {
        if (outcome == needMoreInformation && !CanRequest(roundsSoFar, maxRounds))
            throw ExpertErrors.InformationRequestLimit(maxRounds);
    }
}
