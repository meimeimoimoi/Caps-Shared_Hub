using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.DTOs.Responses;

/// <summary>Whether AI chat and draft generation charge the free quota and credits.</summary>
/// <param name="UpdatedAt">Null while the server setting applies (no admin has set it yet).</param>
public sealed record AiBillingSwitchResponse(
    bool Enabled,
    DateTimeOffset? UpdatedAt,
    string? UpdatedBy
)
{
    public static AiBillingSwitchResponse From(AiBillingSwitch? stored, bool fallback) =>
        stored is null
            ? new(fallback, null, null)
            : new(stored.Enabled, stored.UpdatedAt, stored.UpdatedBy.ToString());
}
