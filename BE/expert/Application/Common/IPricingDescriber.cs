using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the expert's pricing workspace for one service.</summary>
public interface IPricingDescriber
{
    /// <summary>Versions, audit, revision and policy; the qualification's profile must be loaded.</summary>
    Task<PricingWorkspaceResponse> DescribeAsync(
        ExpertServiceQualification qualification,
        CancellationToken ct
    );
}
