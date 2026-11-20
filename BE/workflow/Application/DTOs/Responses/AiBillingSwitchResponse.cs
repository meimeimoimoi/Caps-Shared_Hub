using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>Whether AI chat and draft generation charge the free quota and credits, and at what price.</summary>
/// <param name="ChatCreditCost">Credits per answered chat question once the free uses run out.</param>
/// <param name="DraftCreditCost">Credits per AI draft once the free uses run out.</param>
/// <param name="InitialFreeQuota">Free AI uses an account gets on its first AI request.</param>
/// <param name="UpdatedAt">Null while the server settings apply (no admin has set them yet).</param>
public sealed record AiBillingSwitchResponse(
    bool Enabled,
    long ChatCreditCost,
    long DraftCreditCost,
    int InitialFreeQuota,
    DateTimeOffset? UpdatedAt,
    string? UpdatedBy
)
{
    public static AiBillingSwitchResponse From(
        AiBillingSwitch? stored,
        AiBillingSettings fallback
    ) =>
        stored is null
            ? new(
                fallback.Enabled,
                fallback.ChatCreditCost,
                fallback.DraftCreditCost,
                fallback.InitialFreeQuota,
                null,
                null
            )
            : new(
                stored.Enabled,
                stored.ChatCreditCost,
                stored.DraftCreditCost,
                stored.InitialFreeQuota,
                stored.UpdatedAt,
                stored.UpdatedBy.ToString()
            );
}
