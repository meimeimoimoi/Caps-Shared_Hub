namespace Caps.Workflow.Application.Abstractions;

/// <summary>The expert's capacity slots, held from acceptance until the case ends; both calls are safe to repeat.</summary>
public interface IExpertSlots
{
    /// <summary>Takes a slot for the case; fails with EXPERT_FULL when the expert has none left.</summary>
    Task TakeAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct);

    /// <summary>Frees the case's slot; a case without one is ignored.</summary>
    Task ReleaseAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct);
}
