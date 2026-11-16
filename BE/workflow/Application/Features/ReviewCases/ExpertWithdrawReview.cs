using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert gives up a case they accepted but cannot deliver, with a reason.</summary>
public sealed record ExpertWithdrawReviewCommand(Guid UserId, Guid ReviewCaseId, string? Reason);

/// <summary>Closes the case, refunds the client in full and frees the expert's slot.</summary>
public sealed class ExpertWithdrawReviewHandler(
    IReviewCaseRepository cases,
    IEscrows escrows,
    IExpertSlots slots,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ExpertWithdrawReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        ExpertWithdrawReviewCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();

        if (reviewCase.ExpertUserId != command.UserId)
        {
            throw WorkflowErrors.ReviewCaseNotFound();
        }

        var withdrawn = reviewCase.WithdrawAccepted(
            reviewCase.ExpertProfileId,
            command.UserId,
            command.Reason,
            clock.GetUtcNow()
        );
        // Money and slot before saving: if either call fails the case keeps running and the expert can retry
        await escrows.RefundAsync(reviewCase.Id, ct);
        await slots.ReleaseAsync(reviewCase.ExpertProfileId, reviewCase.Id, ct);
        cases.AddHistory(withdrawn);
        await events.StatusChangedAsync(reviewCase, withdrawn, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
