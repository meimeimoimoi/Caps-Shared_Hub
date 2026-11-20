namespace Caps.Workflow.Application.Common;

/// <summary>
/// Controls whether AI chat and draft generation charge wallet credits or run free of charge,
/// and whether users receive an initial free AI chat quota when billing is enabled.
/// </summary>
public sealed class AiBillingSettings
{
    /// <summary>When false, AI chat and draft generation do not charge wallet credits.</summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// When true (with Enabled = true), users receive InitialFreeQuota free AI chat answers before paying credits.
    /// </summary>
    public bool FreeQuotaEnabled { get; init; }

    /// <summary>Number of free AI chat answers granted per user when FreeQuotaEnabled is true.</summary>
    public int InitialFreeQuota { get; init; } = 10;

    /// <summary>Credits (in VND) charged per answered AI chat message when AI billing is enabled.</summary>
    public long ChatCreditCost { get; init; } = 1_000;

    /// <summary>Credits (in VND) charged per AI draft generation when AI billing is enabled.</summary>
    public long DraftCreditCost { get; init; } = 2_000;
}
