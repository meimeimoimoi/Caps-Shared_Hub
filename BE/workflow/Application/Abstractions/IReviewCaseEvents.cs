using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Tells other services about review case steps (notifications); never fails the caller.</summary>
public interface IReviewCaseEvents
{
    /// <summary>The case was paid and now waits for the expert.</summary>
    Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct);
}
