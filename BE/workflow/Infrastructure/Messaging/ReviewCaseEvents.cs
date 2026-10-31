using Caps.Contracts;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Messaging;

/// <summary>Publishes review case events to RabbitMQ for the notification service.</summary>
// published after commit without an outbox; a broker outage loses the notification (the case and
// the money are already saved and the expert still sees the case in their list). Add an outbox if that matters.
public sealed class MassTransitReviewCaseEvents(
    IPublishEndpoint publisher,
    TimeProvider clock,
    ILogger<MassTransitReviewCaseEvents> logger
) : IReviewCaseEvents
{
    private static readonly TimeSpan PublishTimeout = TimeSpan.FromSeconds(5);

    public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct) =>
        PublishAsync(
            new ReviewCaseRequestedEvent(
                Guid.NewGuid(),
                reviewCase.Id,
                reviewCase.ExpertUserId,
                reviewCase.Fee,
                reviewCase.TurnaroundHours,
                reviewCase.ResponseDeadline,
                clock.GetUtcNow()
            ),
            reviewCase.Id,
            ct
        );

    public Task InfoRequestedAsync(
        ReviewCase reviewCase,
        InfoRequest request,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseInfoRequestedEvent(
                Guid.NewGuid(),
                reviewCase.Id,
                reviewCase.RequesterUserId,
                reviewCase.RequesterEmail,
                request.Message,
                request.DueAt,
                clock.GetUtcNow()
            ),
            reviewCase.Id,
            ct
        );

    public Task StatusChangedAsync(
        ReviewCase reviewCase,
        ReviewStatusHistory history,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseStatusChangedEvent(
                Guid.NewGuid(),
                reviewCase.Id,
                history.FromStatus,
                history.ToStatus,
                history.Note,
                reviewCase.RequesterUserId,
                reviewCase.RequesterEmail,
                reviewCase.ExpertUserId,
                clock.GetUtcNow()
            ),
            reviewCase.Id,
            ct
        );

    private async Task PublishAsync<T>(T message, Guid caseId, CancellationToken ct)
        where T : class
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(PublishTimeout);
        try
        {
            await publisher.Publish(message, timeout.Token);
        }
        catch (Exception e)
            when (e is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // The step is committed: a lost notification must not turn it into an error for the caller
            logger.LogWarning(
                e,
                "Review case {CaseId}: {Event} was not published.",
                caseId,
                typeof(T).Name
            );
        }
    }
}

/// <summary>Development without RabbitMQ: events are dropped.</summary>
public sealed class NoReviewCaseEvents : IReviewCaseEvents
{
    public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct) => Task.CompletedTask;

    public Task InfoRequestedAsync(
        ReviewCase reviewCase,
        InfoRequest request,
        CancellationToken ct
    ) => Task.CompletedTask;

    public Task StatusChangedAsync(
        ReviewCase reviewCase,
        ReviewStatusHistory history,
        CancellationToken ct
    ) => Task.CompletedTask;
}
