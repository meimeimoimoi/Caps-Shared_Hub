using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>The client complains about a delivery before accepting it.</summary>
public sealed record OpenDisputeCommand(
    Guid UserId,
    Guid ReviewCaseId,
    string? Reason,
    string? Description
);

/// <summary>Opens the dispute; the case waits for an admin's decision instead of auto-confirming.</summary>
public sealed class OpenDisputeHandler(
    IReviewCaseRepository cases,
    IReviewDisputeRepository disputes,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<OpenDisputeCommand, DisputeResponse>
{
    public async Task<DisputeResponse> HandleAsync(OpenDisputeCommand command, CancellationToken ct)
    {
        // The row lock keeps the expiry job from auto-confirming the case at the same moment
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var (dispute, opened) = reviewCase.OpenDispute(
            command.UserId,
            command.Reason,
            command.Description,
            clock.GetUtcNow()
        );
        disputes.Add(dispute);
        cases.AddHistory(opened);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return DisputeResponse.From(dispute);
    }
}
