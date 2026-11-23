using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the System Admin's view of the adjustable policy values.</summary>
public interface IPolicyDescriber
{
    Task<ExpertPolicyResponse> DescribeAsync(CancellationToken ct);
}
