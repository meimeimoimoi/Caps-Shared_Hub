namespace Caps.Workflow.Application.Abstractions;

/// <summary>The billing service port for holding, capturing, and releasing prepaid AI credits.</summary>
public interface IAiCredits
{
    /// <summary>Reserves credits from the user's wallet for an AI usage; safe to retry with the same id.</summary>
    Task HoldAsync(Guid userId, Guid aiUsageId, long amount, string? note, CancellationToken ct);

    /// <summary>Captures previously held credits once the AI response or draft is stored.</summary>
    Task CaptureAsync(Guid aiUsageId, Guid? documentVersionId, string? note, CancellationToken ct);

    /// <summary>Returns previously held credits back to the user's spendable balance when unanswered or failed.</summary>
    Task ReleaseAsync(Guid aiUsageId, string? note, CancellationToken ct);
}
