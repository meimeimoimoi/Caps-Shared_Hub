using Caps.Common.Application;
using Caps.Contracts;
using Caps.Expert.Application.Features.Violations;
using MassTransit;

namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>Counts a violation reported by workflow; the handler ignores a redelivered event.</summary>
public sealed class ExpertViolationConsumer(ICommandHandler<RecordViolationCommand> handler)
    : IConsumer<ExpertViolationRecordedEvent>
{
    public Task Consume(ConsumeContext<ExpertViolationRecordedEvent> context)
    {
        var m = context.Message;
        return handler.HandleAsync(
            new(m.ExpertUserId, m.ReviewCaseId, m.Kind, m.OccurredAt),
            context.CancellationToken
        );
    }
}
