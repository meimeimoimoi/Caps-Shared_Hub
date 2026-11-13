using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client takes a request back before the expert answers.</summary>
public sealed record WithdrawReviewCommand(Guid UserId, Guid ReviewCaseId);

/// <summary>
/// Refunds a paid request in full before closing it, so a billing failure leaves it waiting; the row lock
/// decides a race with the expert's accept.
/// </summary>
public sealed class WithdrawReviewHandler(
    IReviewCaseRepository cases,
    IEscrows escrows,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<WithdrawReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        WithdrawReviewCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var withdrawn = reviewCase.Withdraw(command.UserId, clock.GetUtcNow());
        if (reviewCase.Status == ReviewCaseStatus.Withdrawn)
        {
            await escrows.RefundAsync(reviewCase.Id, ct);
        }
        cases.AddHistory(withdrawn);
        await events.StatusChangedAsync(reviewCase, withdrawn, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
