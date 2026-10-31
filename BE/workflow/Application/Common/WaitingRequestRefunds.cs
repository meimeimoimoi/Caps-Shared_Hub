using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Common;

/// <summary>
/// Refunds paid requests the expert can no longer answer and closes them as declined by the system. Best effort,
/// each case in its own transaction: one left waiting (billing down) is refunded by the expiry job at its
/// response deadline.
/// </summary>
public sealed class WaitingRequestRefunds(
    IReviewCaseRepository cases,
    IEscrows escrows,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
)
{
    public async Task RefundAsync(
        IEnumerable<Guid> reviewCaseIds,
        string reason,
        CancellationToken ct
    )
    {
        foreach (var id in reviewCaseIds)
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
                var closed = waiting.CloseUnanswered(reason, clock.GetUtcNow());
                cases.AddHistory(closed);
                await unitOfWork.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await events.StatusChangedAsync(waiting, closed, ct);
            }
            catch (AppException) when (!ct.IsCancellationRequested)
            {
                // Left waiting: the expiry job refunds it at the response deadline
            }
        }
    }
}
