using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
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
    IEscrows escrows,
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
        if (freeSlots == 0)
        {
            await RefundWaitingAsync(reviewCase.ExpertProfileId, ct);
        }
        return ReviewCaseResponse.From(reviewCase);
    }

    /// <summary>
    /// The expert just took their last slot, so the other paid requests could only wait out the response
    /// deadline: refund them now. Best effort after the accept committed; one left waiting is refunded by the
    /// expiry job at its deadline.
    /// </summary>
    private async Task RefundWaitingAsync(Guid expertProfileId, CancellationToken ct)
    {
        foreach (var id in await cases.ListPendingIdsAsync(expertProfileId, ct))
        {
            try
            {
                await using var tx = await unitOfWork.BeginTransactionAsync(ct);
                var waiting = await cases.FindForUpdateAsync(id, ct);
                if (waiting is not { Status: ReviewCaseStatus.PendingExpertResponse })
                {
                    continue;
                }
                // Refund before closing: a failure leaves the request waiting, never closed with the money held
                await escrows.RefundAsync(id, ct);
                cases.AddHistory(waiting.CloseForFullExpert(clock.GetUtcNow()));
                await unitOfWork.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (AppException) when (!ct.IsCancellationRequested)
            {
                //Left waiting: the expiry job refunds it at the response deadline
            }
        }
    }
}
