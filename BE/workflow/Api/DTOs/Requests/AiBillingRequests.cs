using System.ComponentModel.DataAnnotations;
using Caps.Workflow.Application.Features.AiBilling;

namespace Caps.Workflow.Api.DTOs.Requests;

/// <summary>Turns paid AI on or off.</summary>
/// <param name="Enabled">True: AI chat and drafting use the free quota, then credits. False: free for everyone.</param>
public sealed record SetAiBillingSwitchRequest([Required] bool? Enabled)
{
    public SetAiBillingSwitchCommand ToCommand(Guid adminUserId) =>
        new(adminUserId, Enabled!.Value);
}

/// <summary>The AI prices, in credits.</summary>
/// <param name="ChatCreditCost">Credits per answered chat question once the free uses run out; 0 = free.</param>
/// <param name="DraftCreditCost">Credits per AI draft once the free uses run out; 0 = free.</param>
/// <param name="InitialFreeQuota">Free AI uses an account gets on its first AI request.</param>
public sealed record SetAiPricesRequest(
    [Required, Range(0, long.MaxValue)] long? ChatCreditCost,
    [Required, Range(0, long.MaxValue)] long? DraftCreditCost,
    [Required, Range(0, int.MaxValue)] int? InitialFreeQuota
)
{
    public SetAiPricesCommand ToCommand(Guid adminUserId) =>
        new(adminUserId, ChatCreditCost!.Value, DraftCreditCost!.Value, InitialFreeQuota!.Value);
}
