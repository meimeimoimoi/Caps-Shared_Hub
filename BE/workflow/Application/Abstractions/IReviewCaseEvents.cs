using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Tells other services about review case steps (notifications); never fails the caller.</summary>
public interface IReviewCaseEvents
{
    /// <summary>The case was paid and now waits for the expert.</summary>
    Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct);

    /// <summary>The expert asked the client for information; the client is told and emailed.</summary>
    Task InfoRequestedAsync(ReviewCase reviewCase, InfoRequest request, CancellationToken ct);

    /// <summary>The case moved to another status; called after the step is committed.</summary>
    Task StatusChangedAsync(
        ReviewCase reviewCase,
        ReviewStatusHistory history,
        CancellationToken ct
    );
}
