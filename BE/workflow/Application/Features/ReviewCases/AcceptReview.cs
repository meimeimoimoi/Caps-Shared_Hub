using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert takes a paid request.</summary>
public sealed record AcceptReviewCommand(Guid UserId, Guid ReviewCaseId);

/// <summary>Starts the review; the delivery deadline counts from now with the frozen turnaround.</summary>
public sealed class AccpetReviewHandler(
    IReviewCaseRepository cases,
    IExpertSlots slots,
    WaitingRequestRefunds refunds,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AcceptReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        AcceptReviewCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();

        //The token carries the user id only; the case froze the expert's user id at booking
        if (reviewCase.ExpertUserId != command.UserId)
        {
            throw WorkflowErrors.ReviewCaseNotFound();
        }

        var accepted = reviewCase.Accept(
            reviewCase.ExpertProfileId,
            command.UserId,
            clock.GetUtcNow()
        );
        cases.AddHistory(accepted);
        // Atomic in the expert service: a full expert fails here and the case stays pending. A failed save after
        // the take leaves a slot held; retrying the accept reuses it (the slot is keyed by case)
        var freeSlots = await slots.TakeAsync(reviewCase.ExpertProfileId, reviewCase.Id, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await events.StatusChangedAsync(reviewCase, accepted, ct);
        if (freeSlots == 0)
        {
            // The expert is full: the other paid requests could only wait out the response deadline
            var waiting = await cases.ListPendingIdsAsync(reviewCase.ExpertUserId, null, ct);
            await refunds.RefundAsync(waiting, ReviewCase.ExpertFull, ct);
        }
        return ReviewCaseResponse.From(reviewCase);
    }
}
