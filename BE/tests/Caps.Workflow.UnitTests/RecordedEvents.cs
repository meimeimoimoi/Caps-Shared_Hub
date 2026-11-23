using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

/// <summary>Collects the status changes a handler publishes, in order.</summary>
internal sealed class RecordedEvents : IReviewCaseEvents
{
    public List<string> StatusChanges { get; } = [];

    public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct) => Task.CompletedTask;

    public Task InfoRequestedAsync(
        ReviewCase reviewCase,
        InfoRequest request,
        CancellationToken ct
    ) => Task.CompletedTask;

    public Task ResponseDueAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        DateTimeOffset responseDeadline,
        CancellationToken ct
    ) => Task.CompletedTask;

    public Task StatusChangedAsync(
        ReviewCase reviewCase,
        ReviewStatusHistory history,
        CancellationToken ct
    )
    {
        StatusChanges.Add(history.ToStatus);
        return Task.CompletedTask;
    }
}
