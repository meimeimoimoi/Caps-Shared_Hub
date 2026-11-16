namespace Caps.Workflow.Application.Common;

/// <summary>
/// Controls whether AI chat and draft generation charge wallet credits or run free of charge.
/// </summary>
public sealed class AiBillingSettings
{
    /// <summary>When false, AI chat and draft generation do not charge wallet credits.</summary>
    public bool Enabled { get; init; }

    /// <summary>Credits (in VND) charged per answered AI chat message when AI billing is enabled.</summary>
    public long ChatCreditCost { get; init; } = 1_000;

    /// <summary>Credits (in VND) charged per AI draft generation when AI billing is enabled.</summary>
    public long DraftCreditCost { get; init; } = 2_000;
}
