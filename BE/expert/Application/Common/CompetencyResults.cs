using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Maps stored Gate 2 results to the response shared by the expert and reviewer views.</summary>
public static class CompetencyResults
{
    public static CompetencyResultResponse[] ToResponses(
        IEnumerable<CompetencyAssessment> assessments
    ) =>
        assessments
            .Select(x => new CompetencyResultResponse(
                x.Competency,
                x.Result,
                x.Note,
                x.Evidence.Select(e => e.EvidenceId.ToString()).ToArray(),
                x.CreatedAt
            ))
            .ToArray();
}
