namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>An expert's violation points for the admin (2026-11-20 rules).</summary>
/// <param name="Points">Points counted now: not excused and within the window.</param>
/// <param name="ExcusesLeft">How many more violations can be excused within the window.</param>
public sealed record ExpertViolationsResponse(
    int Points,
    int ExcusesLeft,
    int WindowDays,
    ExpertViolationResponse[] Items
);

/// <summary>One review case that counted against the expert.</summary>
/// <param name="Counted">Still counts: within the window and not excused.</param>
public sealed record ExpertViolationResponse(
    string ReviewCaseId,
    string Kind,
    int Points,
    DateTimeOffset OccurredAt,
    bool Counted,
    DateTimeOffset? ExcusedAt,
    string? ExcusedReason
);
