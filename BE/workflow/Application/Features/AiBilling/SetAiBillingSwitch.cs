using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Features.AiBilling;

/// <summary>An admin turns paid AI on or off.</summary>
public sealed record SetAiBillingSwitchCommand(Guid AdminUserId, bool Enabled);

/// <summary>
/// Saves the switch; it applies to the next AI request, with no restart. Requests already running keep the
/// mode they started with.
/// </summary>
public sealed class SetAiBillingSwitchHandler(
    IAiBillingSwitchRepository switches,
    AiBillingSettings settings,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetAiBillingSwitchCommand, AiBillingSwitchResponse>
{
    public async Task<AiBillingSwitchResponse> HandleAsync(
        SetAiBillingSwitchCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var stored = await switches.FindAsync(ct);
        if (stored is null)
        {
            stored = AiBillingSwitch.Create(
                command.Enabled,
                settings.ChatCreditCost,
                settings.DraftCreditCost,
                settings.InitialFreeQuota,
                command.AdminUserId,
                now
            );
            switches.Add(stored);
        }
        else
        {
            stored.Set(command.Enabled, command.AdminUserId, now);
        }
        // shortcut: two admins setting it for the very first time at once fail one save; a retry updates the row
        await unitOfWork.SaveChangesAsync(ct);
        return AiBillingSwitchResponse.From(stored, settings);
    }
}
