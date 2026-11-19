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
