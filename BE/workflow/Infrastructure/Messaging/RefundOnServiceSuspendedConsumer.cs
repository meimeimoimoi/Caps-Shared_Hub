using Caps.Common.Application;
using Caps.Contracts;
using Caps.Workflow.Application.Features.ReviewCases;
using MassTransit;

namespace Caps.Workflow.Infrastructure.Messaging;

/// <summary>
/// Refunds the waiting requests of a service an admin suspended. Named apart from the notification service's
/// consumer of the same event: MassTransit names queues after the consumer class, and a shared queue would split
/// the messages between the two services instead of copying them.
/// </summary>
public sealed class RefundOnServiceSuspendedConsumer(
    ICommandHandler<RefundSuspendedServiceCommand> handler
) : IConsumer<ExpertServiceAccessChangedEvent>
{
    public Task Consume(ConsumeContext<ExpertServiceAccessChangedEvent> context) =>
        context.Message.Change == "SUSPENDED"
            ? handler.HandleAsync(
                new(context.Message.UserId, context.Message.ServiceCode),
                context.CancellationToken
            )
            : Task.CompletedTask;
}
