namespace Caps.Expert.Domain.Reviews;

/// <summary>
/// Caps the rounds of "more information needed" a review may ask for (Gate 1 and Gate 2, policy
/// MaxInformationRequests). Rounds are counted from the status history, so reviews already open when the
/// limit was introduced keep the rounds they had.
/// </summary>
public static class InformationRequestRules
{
    private const string NeedMoreInformation = "NEED_MORE_INFORMATION";

    /// <summary>
    /// Rounds asked for so far: decisions that moved the review to NEED_MORE_INFORMATION. The opening event of a
    /// re-registration (no previous status) waits for new evidence and is not a round.
    /// </summary>
    public static int Count(IEnumerable<(string? FromStatus, string ToStatus)> history) =>
        history.Count(x => x.FromStatus != null && x.ToStatus == NeedMoreInformation);

    /// <summary>True while one more round can still be asked for.</summary>
    public static bool CanRequest(int roundsSoFar, int maxRounds) => roundsSoFar < maxRounds;

    /// <summary>Throws when the decision asks for more information after the last allowed round.</summary>
    /// <param name="outcome">The status the decision leads to.</param>
    public static void EnsureAllowed(string outcome, int roundsSoFar, int maxRounds)
    {
        if (outcome == NeedMoreInformation && !CanRequest(roundsSoFar, maxRounds))
            throw ExpertErrors.InformationRequestLimit(maxRounds);
    }
}
