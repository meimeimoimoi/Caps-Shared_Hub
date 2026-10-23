using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.Application.Common;

/// <summary>Maps the expert's evidence per competency and the information rounds to responses.</summary>
public static class CompetencySubmissions
{
    /// <summary>One entry per competency C1…C5, in display order, even when nothing was sent for it.</summary>
    public static CompetencySubmissionResponse[] ToResponses(
        IEnumerable<CompetencyEvidenceLink> links,
        IEnumerable<CompetencyDescription> descriptions
    )
    {
        var byCode = links.ToLookup(x => x.Competency);
        var texts = descriptions.ToDictionary(x => x.Competency, x => x.Text);
        return CompetencyCriteria
            .Codes.Select(code => new CompetencySubmissionResponse(
                code,
                texts.GetValueOrDefault(code),
                byCode[code].Select(x => x.EvidenceId.ToString()).ToArray()
            ))
            .ToArray();
    }

    /// <summary>Rounds used from the status history against the policy limit.</summary>
    public static InformationRoundsResponse Rounds(
        IEnumerable<(string? FromStatus, string ToStatus)> history,
        int max
    )
    {
        var used = InformationRequestRules.Count(history);
        return new(used, max, InformationRequestRules.CanRequest(used, max));
    }
}
