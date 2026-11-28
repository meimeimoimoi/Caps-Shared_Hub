using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.DTOs.Responses;

namespace Caps.Workflow.Application.Features.AiBilling;

/// <summary>Reads the paid-AI switch.</summary>
public sealed record GetAiBillingSwitchQuery;

/// <summary>The stored switch, or the AiBilling:Enabled setting before an admin first sets it.</summary>
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
        return AiBillingSwitchResponse.From(stored, settings.Enabled);
    }
}
