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
                clock.GetUtcNow(),
                reviewCase.ExpertEmail
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

    public async Task StatusChangedAsync(
        ReviewCase reviewCase,
        ReviewStatusHistory history,
        CancellationToken ct
    )
    {
        await PublishAsync(
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
        // Delivered late, withdrew or never delivered: the expert service conunts the points
        if (reviewCase.ViolationOf(history) is { } kind)
        {
            await PublishAsync(
                new ExpertViolationRecordedEvent(
                    Guid.NewGuid(),
                    reviewCase.Id,
                    reviewCase.ExpertUserId,
                    kind,
                    history.CreatedAt
                ),
                reviewCase.Id,
                ct
            );
        }
    }

    public Task ResponseDueAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        DateTimeOffset responseDeadline,
        string? expertEmail,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseResponseDueEvent(
                Guid.NewGuid(),
                reviewCaseId,
                expertUserId,
                responseDeadline,
                clock.GetUtcNow(),
                expertEmail
            ),
            reviewCaseId,
            ct
        );

    public Task StatementDueAsync(
        Guid reviewCaseId,
        Guid expertUserId,
        DateTimeOffset statementDueBy,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseStatementDueEvent(
                Guid.NewGuid(),
                reviewCaseId,
                expertUserId,
                statementDueBy,
                clock.GetUtcNow()
            ),
            reviewCaseId,
            ct
        );

    public Task AcceptanceDueAsync(
        Guid reviewCaseId,
        Guid requesterUserId,
        string? requesterEmail,
        DateTimeOffset acceptanceDeadline,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseAcceptanceDueEvent(
                Guid.NewGuid(),
                reviewCaseId,
                requesterUserId,
                requesterEmail,
                acceptanceDeadline,
                clock.GetUtcNow()
            ),
            reviewCaseId,
            ct
        );

    public Task DisputeOverdueAsync(
        Guid reviewCaseId,
        Guid requesterUserId,
        Guid expertUserId,
        DateTimeOffset decideBy,
        bool extended,
        bool first,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseDisputeOverdueEvent(
                Guid.NewGuid(),
                reviewCaseId,
                requesterUserId,
                expertUserId,
                decideBy,
                extended,
                first,
                clock.GetUtcNow()
            ),
            reviewCaseId,
            ct
        );

    public Task DisputeExtendedAsync(
        ReviewCase reviewCase,
        ReviewDispute dispute,
        CancellationToken ct
    ) =>
        PublishAsync(
            new ReviewCaseDisputeExtendedEvent(
                Guid.NewGuid(),
                reviewCase.Id,
                reviewCase.RequesterUserId,
                reviewCase.ExpertUserId,
                dispute.DecideBy,
                clock.GetUtcNow()
            ),
            reviewCase.Id,
            ct
        );

    public Task ExtensionRequestedAsync(ReviewCase reviewCase, CancellationToken ct) =>
        PublishAsync(
            new ReviewCaseExtensionRequestedEvent(
                Guid.NewGuid(),
                reviewCase.Id,
                reviewCase.RequesterUserId,
                reviewCase.RequesterEmail,
                reviewCase.ExtensionDays!.Value,
                reviewCase.ExtensionReason!,
                reviewCase.DeliveryDeadline!.Value,
                clock.GetUtcNow()
            ),
            reviewCase.Id,
            ct
        );

    public Task ExtensionDecidedAsync(ReviewCase reviewCase, CancellationToken ct) =>
        PublishAsync(
            new ReviewCaseExtensionDecidedEvent(
                Guid.NewGuid(),
                reviewCase.Id,
                reviewCase.ExpertUserId,
                reviewCase.ExtensionDecision == ReviewCase.ExtensionAccepted,
                reviewCase.ExtensionDays!.Value,
                reviewCase.DeliveryDeadline!.Value,
                clock.GetUtcNow()
            ),
            reviewCase.Id,
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
        string? expertEmail,
        CancellationToken ct
    ) => Task.CompletedTask;
}
