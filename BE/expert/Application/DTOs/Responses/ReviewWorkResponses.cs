namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>Rounds of "more information needed" asked for so far and the policy limit (M4).</summary>
/// <param name="CanRequestMore">False on the last allowed round: the reviewer must pass or fail.</param>
public sealed record InformationRoundsResponse(int Used, int Max, bool CanRequestMore);

/// <summary>What the expert sent for one competency: a short description and the files tied to it (E3, E4).</summary>
public sealed record CompetencySubmissionResponse(
    string Code,
    string? Description,
    string[] EvidenceIds
);
