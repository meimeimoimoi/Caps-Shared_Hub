namespace Caps.Workflow.Domain.Workspace;

/// <summary>
/// The platform-wide paid-AI policy: the on/off switch and the AI prices. On: AI chat and draft generation use
/// the free quota, then wallet credits. Off: they are free. A single row; until an admin sets it, the AiBilling
/// settings apply.
/// </summary>
public sealed class AiBillingSwitch
{
    public const int SingletonId = 1;

    private AiBillingSwitch() { }

    public int Id { get; } = SingletonId;
    public bool Enabled { get; private set; }

    /// <summary>Credits held for each answered AI chat question once the free uses run out; 0 = free.</summary>
    public long ChatCreditCost { get; private set; }

    /// <summary>Credits held for each AI draft once the free uses run out; 0 = free.</summary>
    public long DraftCreditCost { get; private set; }

    /// <summary>Free AI uses an account gets on its first AI request; balances already given are not changed.</summary>
    public int InitialFreeQuota { get; private set; }

    /// <summary>The admin who last changed it.</summary>
    public Guid UpdatedBy { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static AiBillingSwitch Create(
        bool enabled,
        long chatCreditCost,
        long draftCreditCost,
        int initialFreeQuota,
        Guid adminUserId,
        DateTimeOffset now
    )
    {
        var policy = new AiBillingSwitch { Enabled = enabled };
        policy.SetPrices(chatCreditCost, draftCreditCost, initialFreeQuota, adminUserId, now);
        return policy;
    }

    public void Set(bool enabled, Guid adminUserId, DateTimeOffset now)
    {
        Enabled = enabled;
        UpdatedBy = adminUserId;
        UpdatedAt = now;
    }

    public void SetPrices(
        long chatCreditCost,
        long draftCreditCost,
        int initialFreeQuota,
        Guid adminUserId,
        DateTimeOffset now
    )
    {
        if (chatCreditCost < 0 || draftCreditCost < 0 || initialFreeQuota < 0)
        {
            throw WorkflowErrors.AiPriceInvalid();
        }

        ChatCreditCost = chatCreditCost;
        DraftCreditCost = draftCreditCost;
        InitialFreeQuota = initialFreeQuota;
        UpdatedBy = adminUserId;
        UpdatedAt = now;
    }
}
