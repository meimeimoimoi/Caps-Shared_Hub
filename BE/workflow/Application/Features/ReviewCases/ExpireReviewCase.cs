using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expiry job's step for one review case whose deadline passed.</summary>
public sealed record ExpireReviewCaseCommand(Guid ReviewCaseId);

/// <summary>
/// Moves an overdue case to its timeout status and settles the money: an expert who never answered or never
/// delivered refunds the client; an unconfirmed delivery or a silent client splits the fee by the frozen rules.
/// A case that is no longer overdue (already handled, or moved by a user meanwhile) is left alone.
/// </summary>
public sealed class ExpireReviewCaseHandler(
    IReviewCaseRepository cases,
    IInfoRequestRepository infoRequests,
    IEscrows escrows,
    IExpertSlots slots,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ExpireReviewCaseCommand>
{
    public async Task HandleAsync(ExpireReviewCaseCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase = await cases.FindForUpdateAsync(command.ReviewCaseId, ct);
        if (reviewCase is null)
        {
            return;
        }
        var now = clock.GetUtcNow();
        var history = reviewCase.ExpireIfOverdue(now);
        if (history is null && reviewCase.Status == ReviewCaseStatus.AwaitingUserInformation)
        {
            var request = await infoRequests.FindOpenForUpdateAsync(reviewCase.Id, ct);
            history = request is null ? null : reviewCase.TerminateForNoResponse(request, now);
        }
        if (history is null)
        {
            return;
        }

        // Money before saving: if billing fails nothing is saved and the next run retries; every call is idempotent
        switch (reviewCase.Status)
        {
            case ReviewCaseStatus.ExpertTimeout:
                await escrows.RefundAsync(reviewCase.Id, ct);
                break;
            case ReviewCaseStatus.DeliveryOverdue:
                await escrows.RefundAsync(reviewCase.Id, ct);
                await slots.ReleaseAsync(reviewCase.ExpertProfileId, reviewCase.Id, ct);
                break;
            case ReviewCaseStatus.AutoConfirmed or ReviewCaseStatus.Terminated:
                await escrows.ReleaseAsync(
                    reviewCase.Id,
                    reviewCase.ExpertUserId,
                    reviewCase.Settle(),
                    ct
                );
                await slots.ReleaseAsync(reviewCase.ExpertProfileId, reviewCase.Id, ct);
                break;
        }
        cases.AddHistory(history);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
