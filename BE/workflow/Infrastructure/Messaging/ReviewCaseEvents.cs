using System.Text.Json;
using Caps.Contracts;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Infrastructure.Persistence;

namespace Caps.Workflow.Infrastructure.Messaging;

/// <summary>Publishes review case events to RabbitMQ for the notification service.</summary>
public sealed class OutboxReviewCaseEvents(WorkflowDbContext db, TimeProvider clock)
    : IReviewCaseEvents
{
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

    public Task ResponseDueAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        DateTimeOffset responseDeadline,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseResponseDueEvent(
                Guid.NewGuid(),
                reviewCaseId,
                expertUserId,
                responseDeadline,
                clock.GetUtcNow()
            ),
            reviewCaseId,
            ct
        );

    public Task DisputeOverdueAsync(
        Guid reviewCaseId,
        DateTimeOffset decideBy,
        bool extended,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseDisputeOverdueEvent(
                Guid.NewGuid(),
                reviewCaseId,
                decideBy,
                extended,
                clock.GetUtcNow()
            ),
            reviewCaseId,
            ct
        );

    // Saved with the step by the caller's SaveChanges; the event id doubles as the row id
    private Task PublishAsync<T>(T message, Guid caseId, CancellationToken ct)
        where T : class
    {
        db.EventOutbox.Add(
            new EventOutboxEntry
            {
                Id = (Guid)typeof(T).GetProperty("Id")!.GetValue(message)!,
                MessageType = typeof(T).FullName!,
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = clock.GetUtcNow(),
            }
        );
        return Task.CompletedTask;
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

    public Task ResponseDueAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        DateTimeOffset responseDeadline,
        CancellationToken ct
    ) => Task.CompletedTask;

    public Task DisputeOverdueAsync(
        Guid reviewCaseId,
        DateTimeOffset decideBy,
        bool extended,
        CancellationToken ct
    ) => Task.CompletedTask;
}
