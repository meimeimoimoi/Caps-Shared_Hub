using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.PlatformFees;

/// <summary>Every platform fee a System Admin set for one catalog service.</summary>
public sealed record ListPlatformFeeHistoryQuery(string ServiceCode);

/// <summary>The append-only rows of the service, newest first; an unknown service has none.</summary>
public sealed class ListPlatformFeeHistoryHandler(IPlatformFeeRepository fees)
    : IQueryHandler<ListPlatformFeeHistoryQuery, IReadOnlyList<PlatformFeeChangeResponse>>
{
    public async Task<IReadOnlyList<PlatformFeeChangeResponse>> HandleAsync(
        ListPlatformFeeHistoryQuery query,
        CancellationToken ct
    )
    {
        var code = query.ServiceCode.Trim().ToUpperInvariant();
        var rows = await fees.ListHistoryAsync(code, ct);
        return rows.Select(PlatformFeeChangeResponse.From).ToList();
    }
}
