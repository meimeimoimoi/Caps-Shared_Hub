using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>Asks for the platform fee of every service.</summary>
public sealed record ListPlatformFeesQuery;

/// <summary>
/// Lists every active catalog service with its fee in force (null before the first one), the pending change if
/// any and the first day a new change may take effect.
/// </summary>
public sealed class ListPlatformFeesHandler(
    IServiceCatalogRepository catalog,
    IPlatformFeeRepository fees,
    IExpertPolicyProvider policies,
    TimeProvider clock
) : IQueryHandler<ListPlatformFeesQuery, IReadOnlyList<PlatformFeeResponse>>
{
    public async Task<IReadOnlyList<PlatformFeeResponse>> HandleAsync(
        ListPlatformFeesQuery query,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var services = await catalog.ListActiveAsync(ct);
        var rates = (await fees.ListCurrentAsync(now, ct)).ToDictionary(r => r.ServiceCode);
        var pending = (await fees.ListAllPendingAsync(now, ct))
            .GroupBy(r => r.ServiceCode)
            .ToDictionary(g => g.Key, g => g.MaxBy(r => r.EffectiveFrom));
        var policy = await policies.GetPricingAsync(ct);
        // Catalog display order
        return services
            .Select(s =>
                PlatformFeeRows.Build(
                    s,
                    rates.GetValueOrDefault(s.Code),
                    pending.GetValueOrDefault(s.Code),
                    policy,
                    now
                )
            )
            .ToList();
    }
}
