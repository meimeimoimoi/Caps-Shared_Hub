namespace Caps.Workflow.Application.Abstractions;

/// <summary>The expert's marketplace rating, fed by client ratings of finished cases; safe to repeat.</summary>
public interface IExpertRatings
{
    /// <summary>Counts the case's stars into the expert's average once; a repeat for the same case is ignored.</summary>
    Task RecordAsync(Guid expertProfileId, Guid reviewCaseId, short stars, CancellationToken ct);
}
