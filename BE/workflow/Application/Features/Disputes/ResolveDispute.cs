using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>A system admin decides a dispute.</summary>
/// <param name="RefundPct">Share of the fee returned to the client, 0 to 100.</param>
public sealed record ResolveDisputeCommand(
    Guid AdminUserId,
    Guid ReviewCaseId,
    short RefundPct,
    string? Note
);

/// <summary>
/// Closes the case with the admin's refund; the rest of the fee splits by the frozen platform fee, and the
/// expert's slot is freed.
/// </summary>
public sealed class ResolveDisputeHandler(
    IReviewCaseRepository cases,
    IReviewDisputeRepository disputes,
    IEscrows escrows,
    IExpertSlots slots,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ResolveDisputeCommand, DisputeResponse>
{
    public async Task<DisputeResponse> HandleAsync(
        ResolveDisputeCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewcase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var dispute =
            await disputes.FindByCaseAsync(reviewcase.Id, ct)
            ?? throw WorkflowErrors.DisputeNotFound();
        var resolved = reviewcase.ResolveDispute(
            dispute,
            command.AdminUserId,
            command.RefundPct,
            command.Note,
            clock.GetUtcNow()
        );

        //Settle before saving: if billing fails the dispute stays open and the admin can retry
        await escrows.ReleaseAsync(reviewcase.Id, reviewcase.ExpertUserId, reviewcase.Settle(), ct);
        await slots.ReleaseAsync(reviewcase.ExpertProfileId, reviewcase.Id, ct);

        cases.AddHistory(resolved);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await events.StatusChangedAsync(reviewcase, resolved, ct);
        return DisputeResponse.From(dispute);
    }
}
