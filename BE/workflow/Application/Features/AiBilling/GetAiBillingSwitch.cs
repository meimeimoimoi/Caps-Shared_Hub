using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.AiBilling;

/// <summary>Reads the paid-AI switch and the AI prices.</summary>
public sealed record GetAiBillingSwitchQuery;

/// <summary>The stored switch and prices, or the AiBilling settings before an admin first sets them.</summary>
public sealed class GetAiBillingSwitchHandler(
    IAiBillingSwitchRepository switches,
    AiBillingSettings settings
) : IQueryHandler<GetAiBillingSwitchQuery, AiBillingSwitchResponse>
{
    public async Task<AiBillingSwitchResponse> HandleAsync(
        GetAiBillingSwitchQuery query,
        CancellationToken ct
    )
    {
        var stored = await switches.FindAsync(ct);
        return AiBillingSwitchResponse.From(stored, settings);
    }
}
