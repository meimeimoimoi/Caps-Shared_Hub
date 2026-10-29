using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;

namespace Caps.Expert.Application.Features.ReviewCases;

/// <summary>A review case ended (completed, cancelled or refunded): its slot is free again.</summary>
public sealed record ReleaseCaseSlotCommand(Guid ExpertProfileId, Guid ReviewCaseId);

/// <summary>Frees the slot; releasing twice or a case that never held one changes nothing.</summary>
public sealed class ReleaseCaseSlotHandler(IExpertCaseSlots slots)
    : ICommandHandler<ReleaseCaseSlotCommand>
{
    public Task HandleAsync(ReleaseCaseSlotCommand command, CancellationToken ct) =>
        slots.ReleaseAsync(command.ExpertProfileId, command.ReviewCaseId, ct);
}
