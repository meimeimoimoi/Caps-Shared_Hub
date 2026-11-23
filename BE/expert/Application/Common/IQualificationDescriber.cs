using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the expert's view of a qualification.</summary>
public interface IQualificationDescriber
{
    /// <summary>Files, history, latest Gate 2 results and allowed actions.</summary>
    Task<ExpertQualificationResponse> DescribeAsync(
        Applicant applicant,
        ExpertServiceQualification qualification,
        CancellationToken ct
    );
}
