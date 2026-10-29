using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.ReviewCases;

/// <summary>The expert accepted a review case: it takes one slot of their capacity.</summary>
public sealed record TakeCaseSlotCommand(Guid ExpertProfileId, Guid ReviewCaseId);

/// <summary>
/// Atomic against a concurrent accept for the last slot; a retry for the same case succeeds without counting
/// twice. Not committing on a full expert rolls the slot row back.
/// </summary>
public sealed class TakeCaseSlotHandler(
    IExpertCaseSlots slots,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<TakeCaseSlotCommand>
{
    public async Task HandleAsync(TakeCaseSlotCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var taken = await slots.TakeAsync(
            command.ExpertProfileId,
            command.ReviewCaseId,
            clock.GetUtcNow(),
            ct
        );
        if (!taken)
        {
            throw ExpertErrors.ExpertFull();
        }
        await tx.CommitAsync(ct);
    }
}
