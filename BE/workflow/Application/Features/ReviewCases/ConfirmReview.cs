using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client accepts the delivered result.</summary>
public sealed record ConfirmReviewCommand(Guid UserId, Guid ReviewCaseId);

/// <summary>Completes the case and releases the escrow to the expert minus the frozen platform fee.</summary>
public sealed class ConfirmReviewHandler(
    IReviewCaseRepository cases,
    IEscrows escrows,
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

        //Release before saving: if billing fails the case stays awaiting acceptance and can be retried
        await escrows.ReleaseAsync(
            reviewCase.Id,
            reviewCase.ExpertUserId,
            reviewCase.PlatformFeePct,
            ct
        );

        cases.AddHistory(completed);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
