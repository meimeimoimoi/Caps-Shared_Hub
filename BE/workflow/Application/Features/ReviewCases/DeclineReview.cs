using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert turns down a paid request with a reason.</summary>
public sealed record DeclineReviewCommand(Guid UserId, Guid ReviewCaseId, string? Reason);

/// <summary>Closes the case and refunds the client in full.</summary>
public sealed class DeclineReviewHandler(
    IReviewCaseRepository cases,
    IEscrows escrows,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<DeclineReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        DeclineReviewCommand command,
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

        var declined = reviewCase.Decline(
            reviewCase.ExpertProfileId,
            command.UserId,
            command.Reason,
            clock.GetUtcNow()
        );
        //Refund before saving: if billing fails the case stays pending and the expert can retry
        await escrows.RefundAsync(reviewCase.Id, ct);
        cases.AddHistory(declined);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await events.StatusChangedAsync(reviewCase, declined, ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
