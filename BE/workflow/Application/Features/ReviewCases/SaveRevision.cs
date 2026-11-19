using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert saves a draft of the revised document before delivering.</summary>
public sealed record SaveRevisionCommand(Guid UserId, Guid ReviewCaseId, string? RevisedContent);

/// <summary>Replaces the case's draft revision; only the expert sees it until delivery.</summary>
public sealed class SaveRevisionHandler(
    IReviewCaseRepository cases,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SaveRevisionCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        SaveRevisionCommand command,
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

        reviewCase.SaveRevision(
            reviewCase.ExpertProfileId,
            command.RevisedContent,
            clock.GetUtcNow()
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase, showDraft: true);
    }
}
