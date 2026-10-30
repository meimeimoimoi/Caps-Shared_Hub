using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>The client drops their complaint, which accepts the delivery.</summary>
public sealed record WithdrawDisputeCommand(Guid UserId, Guid ReviewCaseId);

/// <summary>Completes the case and settles it as a confirm would: frozen platform fee, any late refund, slot freed.</summary>
public sealed class WithdrawDisputeHandler(
    IReviewCaseRepository cases,
    IReviewDisputeRepository disputes,
    IEscrows escrows,
    IExpertSlots slots,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<WithdrawDisputeCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        WithdrawDisputeCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        // Party check first, so nobody else learns whether the case has a dispute
        reviewCase.EnsureRequester(command.UserId);
        var dispute =
            await disputes.FindByCaseAsync(reviewCase.Id, ct)
            ?? throw WorkflowErrors.DisputeNotFound();
        var completed = reviewCase.WithdrawDispute(dispute, command.UserId, clock.GetUtcNow());

        // Release before saving: if billing fails the dispute stays open and the client can retry
        await escrows.ReleaseAsync(reviewCase.Id, reviewCase.ExpertUserId, reviewCase.Settle(), ct);
        await slots.ReleaseAsync(reviewCase.ExpertProfileId, reviewCase.Id, ct);

        cases.AddHistory(completed);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
