using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Features.AiBilling;

/// <summary>An admin sets what AI chat and drafting cost, and how many free uses a new account gets.</summary>
public sealed record SetAiPricesCommand(
    Guid AdminUserId,
    long ChatCreditCost,
    long DraftCreditCost,
    int InitialFreeQuota
);

/// <summary>
/// Saves the prices; they apply to the next AI request, with no restart. A new free quota only reaches accounts
/// that have not used AI yet.
/// </summary>
public sealed class SetAiPricesHandler(
    IAiBillingSwitchRepository switches,
    AiBillingSettings settings,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetAiPricesCommand, AiBillingSwitchResponse>
{
    public async Task<AiBillingSwitchResponse> HandleAsync(
        SetAiPricesCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var stored = await switches.FindAsync(ct);
        if (stored is null)
        {
            stored = AiBillingSwitch.Create(
                settings.Enabled,
                command.ChatCreditCost,
                command.DraftCreditCost,
                command.InitialFreeQuota,
                command.AdminUserId,
                now
            );
            switches.Add(stored);
        }
        else
        {
            stored.SetPrices(
                command.ChatCreditCost,
                command.DraftCreditCost,
                command.InitialFreeQuota,
                command.AdminUserId,
                now
            );
        }
        // shortcut: two admins setting it for the very first time at once fail one save; a retry updates the row
        await unitOfWork.SaveChangesAsync(ct);
        return AiBillingSwitchResponse.From(stored, settings);
    }
}
