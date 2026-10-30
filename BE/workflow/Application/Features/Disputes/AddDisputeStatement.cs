using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>The expert explains their side of the dispute.</summary>
public sealed record AddDisputeStatementCommand(Guid UserId, Guid ReviewCaseId, string? Statement);

/// <summary>Stores the expert's one explanation for the admin to read before deciding.</summary>
public sealed class AddDisputeStatementHandler(
    IReviewCaseRepository cases,
    IReviewDisputeRepository disputes,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AddDisputeStatementCommand, DisputeResponse>
{
    public async Task<DisputeResponse> HandleAsync(
        AddDisputeStatementCommand command,
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
        var dispute =
            await disputes.FindByCaseAsync(reviewCase.Id, ct)
            ?? throw WorkflowErrors.DisputeNotFound();
        reviewCase.AddExpertStatement(
            dispute,
            reviewCase.ExpertProfileId,
            command.Statement,
            clock.GetUtcNow()
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return DisputeResponse.From(dispute);
    }
}
