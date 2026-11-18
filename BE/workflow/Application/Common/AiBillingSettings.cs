namespace Caps.Workflow.Application.Common;

/// <summary>
/// Controls whether AI chat and draft generation consume free quota and wallet credits or run free of charge.
/// </summary>
public sealed class AiBillingSettings
{
    /// <summary>When false, AI chat and draft generation do not enforce quota or charge wallet credits.</summary>
    public bool Enabled { get; init; }

    /// <summary>Initial free AI quota granted when creating a user's quota row.</summary>
    public int InitialFreeQuota { get; init; } = 10;

    /// <summary>Credits (in VND) charged per answered AI chat message after free quota runs out.</summary>
    public long ChatCreditCost { get; init; } = 1_000;

    /// <summary>Credits (in VND) charged per AI draft generation after free quota runs out.</summary>
    public long DraftCreditCost { get; init; } = 2_000;
}
