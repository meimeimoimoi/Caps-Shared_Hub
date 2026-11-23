using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the reviewer's view of a qualification.</summary>
public interface IQualificationReviewDescriber
{
    /// <summary>Details, files, history, Gate 1 and latest Gate 2 results; the profile must be loaded.</summary>
    Task<ReviewQualificationResponse> DescribeAsync(
        ExpertServiceQualification qualification,
        CancellationToken ct
    );
}
