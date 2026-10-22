using Caps.Common.Application;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Policies;

public sealed record GetExpertPolicyQuery;

/// <summary>The adjustable policy values in force now, with their defaults and ranges.</summary>
public sealed class GetExpertPolicyHandler(IPolicyDescriber describer)
    : IQueryHandler<GetExpertPolicyQuery, ExpertPolicyResponse>
{
    public Task<ExpertPolicyResponse> HandleAsync(
        GetExpertPolicyQuery query,
        CancellationToken ct
    ) => describer.DescribeAsync(ct);
}
