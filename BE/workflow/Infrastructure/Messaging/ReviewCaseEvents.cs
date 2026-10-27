using Caps.Contracts;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Messaging;

/// <summary>Publishes review case events to RabbitMQ for the notification service.</summary>
//published after commit without an outbox; a broker outage loses the notification (the case and
// the money are already saved and the expert still sees the case in their list). Add an outbox if that matters.
public sealed class MassTransitReviewCaseEvents(
    IPublishEndpoint publisher,
    TimeProvider clock,
    ILogger<MassTransitReviewCaseEvents> logger
) : IReviewCaseEvents
{
    private static readonly TimeSpan PublishTimeout = TimeSpan.FromSeconds(5);

    public async Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(PublishTimeout);
        try
        {
            await publisher.Publish(
                new ReviewCaseRequestedEvent(
                    Guid.NewGuid(),
                    reviewCase.Id,
                    reviewCase.ExpertUserId,
                    reviewCase.Fee,
                    reviewCase.TurnaroundHours,
                    reviewCase.ResponseDeadline,
                    clock.GetUtcNow()
                ),
                timeout.Token
            );
        }
        catch (Exception e)
            when (e is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            //The payment is commited: a lost notification must not turn it into an error for the client
            logger.LogWarning(
                e,
                "Review case {CaseId} was paid but the expert was not notified",
                reviewCase.Id
            );
        }
    }
}

/// <summary>Development without RabbitMQ: events are dropped.</summary>
public sealed class NoReviewCaseEvents : IReviewCaseEvents
{
    public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct) => Task.CompletedTask;
}
