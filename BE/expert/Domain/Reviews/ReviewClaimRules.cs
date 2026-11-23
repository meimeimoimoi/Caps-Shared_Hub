namespace Caps.Expert.Domain.Reviews;

/// <summary>How long a reviewer keeps a claimed review before it returns to the shared queue.</summary>
public sealed record ReviewClaimPolicy(TimeSpan Hold);

/// <summary>Limits on review work shared by Gate 1 and Gate 2: information rounds (M4) and waiting time (M5).</summary>
/// <param name="SlaDays">Days a review may wait for a reviewer before the queue flags it; a warning only.</param>
public sealed record ReviewWorkPolicy(int MaxInformationRequests, int SlaDays);

/// <summary>The two review gates that share the claim rules; same names as the review queue rows.</summary>
public static class ReviewGate
{
    public const string Eligibility = "GATE_1";
    public const string Competency = "GATE_2";
}

/// <summary>What happened to a review's claim, kept in its claim history.</summary>
public static class ReviewClaimAction
{
    /// <summary>A reviewer took the review; with a previous holder, that holder's claim had expired.</summary>
    public const string Claim = "CLAIM";

    /// <summary>The holder gave the review back to the shared queue.</summary>
    public const string Release = "RELEASE";

    /// <summary>A System Admin handed the review to another reviewer.</summary>
    public const string Reassign = "REASSIGN";
}

/// <summary>Which reviews of the queue to show by who holds them.</summary>
public static class ReviewClaimFilter
{
    /// <summary>Reviews the viewer holds now.</summary>
    public const string Mine = "MINE";

    /// <summary>Reviews nobody holds, including expired claims.</summary>
    public const string Unclaimed = "UNCLAIMED";

    /// <summary>The default: what the viewer can work on.</summary>
    public const string MineOrUnclaimed = "MINE_OR_UNCLAIMED";
    public const string All = "ALL";

    public static string Normalize(string? filter) =>
        filter?.Trim().ToUpperInvariant() switch
        {
            Mine => Mine,
            Unclaimed => Unclaimed,
            All => All,
            _ => MineOrUnclaimed,
        };
}

/// <summary>
/// One reviewer per review at a time (operating rule, not a business document rule). A claim expires after the
/// policy hold, counted when read, so no background job is needed; while the review waits for the expert the
/// hold does not run, and a resubmission restarts it.
/// </summary>
public static class ReviewClaimRules
{
    public const int MaxReasonLength = 1000;

    /// <summary>True when someone holds the review now.</summary>
    /// <param name="waitingForExpert">More information was requested; the claim does not expire meanwhile.</param>
    public static bool IsActive(
        Guid? holderUserId,
        DateTimeOffset? claimedAt,
        bool waitingForExpert,
        DateTimeOffset now,
        TimeSpan hold
    ) => holderUserId != null && claimedAt != null && (waitingForExpert || claimedAt + hold > now);

    /// <summary>When the claim lapses; null while waiting for the expert or when nobody holds it.</summary>
    public static DateTimeOffset? ExpiresAt(
        Guid? holderUserId,
        DateTimeOffset? claimedAt,
        bool waitingForExpert,
        TimeSpan hold
    ) => holderUserId == null || waitingForExpert ? null : claimedAt + hold;

    /// <summary>The trimmed reason of a reassignment; required and limited in length.</summary>
    public static string CleanReason(string? reason)
    {
        reason = reason?.Trim();
        if (string.IsNullOrEmpty(reason))
            throw ExpertErrors.ClaimReassignReasonRequired();
        if (reason.Length > MaxReasonLength)
            throw ExpertErrors.ClaimReassignReasonTooLong(MaxReasonLength);
        return reason;
    }
}
