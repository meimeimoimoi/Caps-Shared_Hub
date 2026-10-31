using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert delivers the review result.</summary>
/// <param name="Result">VERIFIED or CANNOT_VERIFY.</param>
public sealed record DeliverReviewCommand(
    Guid UserId,
    Guid ReviewCaseId,
    string? Result,
    string? Summary,
    string? CannotVerifyReason
);

/// <summary>Hands the result to the client, who then has the acceptance window to confirm.</summary>
public sealed class DeliverReviewHandler(
    IReviewCaseRepository cases,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<DeliverReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        DeliverReviewCommand command,
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

        var delivered = reviewCase.Deliver(
            reviewCase.ExpertProfileId,
            command.UserId,
            command.Result,
            command.Summary,
            command.CannotVerifyReason,
            clock.GetUtcNow()
        );
        cases.AddHistory(delivered);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await events.StatusChangedAsync(reviewCase, delivered, ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
