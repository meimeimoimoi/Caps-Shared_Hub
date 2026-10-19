using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>Asks for the current platform fee of every service.</summary>
public sealed record ListPlatformFeesQuery;

/// <summary>Lists the services open for pricing with their current platform fee.</summary>
public sealed class ListPlatformFeesHandler(IPlatformFeeRepository fees, TimeProvider clock)
    : IQueryHandler<ListPlatformFeesQuery, IReadOnlyList<PlatformFeeResponse>>
{
    public async Task<IReadOnlyList<PlatformFeeResponse>> HandleAsync(
        ListPlatformFeesQuery query,
        CancellationToken ct
    )
    {
        var rates = await fees.ListCurrentAsync(clock.GetUtcNow(), ct);
        return rates
            .Select(r => new PlatformFeeResponse(r.ServiceType, r.Percent, r.EffectiveFrom))
            .OrderBy(r => r.ServiceType, StringComparer.Ordinal) // same order on every machine
            .ToList();
    }
}
