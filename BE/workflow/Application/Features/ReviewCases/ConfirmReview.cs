using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client accepts the delivered result.</summary>
public sealed record ConfirmReviewCommand(Guid UserId, Guid ReviewCaseId);

/// <summary>
/// Completes the case, settles the escrow with the frozen platform fee and any late refund, and frees the
/// expert's slot.
/// </summary>
public sealed class ConfirmReviewHandler(
    IReviewCaseRepository cases,
    IEscrows escrows,
    IExpertSlots slots,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ConfirmReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        ConfirmReviewCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var completed = reviewCase.Confirm(command.UserId, clock.GetUtcNow());

        // Release before saving: if billing fails the case stays awaiting acceptance and can be retried
        await escrows.ReleaseAsync(reviewCase.Id, reviewCase.ExpertUserId, reviewCase.Settle(), ct);
        // Both calls are idempotent, so a retry after a failure here settles and frees nothing twice
        await slots.ReleaseAsync(reviewCase.ExpertProfileId, reviewCase.Id, ct);

        cases.AddHistory(completed);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await events.StatusChangedAsync(reviewCase, completed, ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
