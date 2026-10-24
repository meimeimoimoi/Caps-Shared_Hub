using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>Asks for the current platform fee of every service.</summary>
public sealed record ListPlatformFeesQuery;

/// <summary>Lists every active catalog service with its current platform fee (null before the first one).</summary>
public sealed class ListPlatformFeesHandler(
    IServiceCatalogRepository catalog,
    IPlatformFeeRepository fees
) : IQueryHandler<ListPlatformFeesQuery, IReadOnlyList<PlatformFeeResponse>>
{
    public async Task<IReadOnlyList<PlatformFeeResponse>> HandleAsync(
        ListPlatformFeesQuery query,
        CancellationToken ct
    )
    {
        var services = await catalog.ListActiveAsync(ct);
        var rates = (await fees.ListCurrentAsync(ct)).ToDictionary(r => r.ServiceCode);
        // Catalog display order
        return services
            .Select(s =>
            {
                var rate = rates.GetValueOrDefault(s.Code);
                return new PlatformFeeResponse(s.Code, s.Name, rate?.Percent, rate?.EffectiveFrom);
            })
            .ToList();
    }
}
