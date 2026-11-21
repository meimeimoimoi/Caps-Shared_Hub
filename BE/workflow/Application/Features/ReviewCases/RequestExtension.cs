using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert asks the client for more working days before the delivery deadline.</summary>
public sealed record RequestExtensionCommand(
    Guid UserId,
    Guid ReviewCaseId,
    int Days,
    string? Reason
);

/// <summary>Records the request; the deadline only moves when the client accepts.</summary>
public sealed class RequestExtensionHandler(
    IReviewCaseRepository cases,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RequestExtensionCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        RequestExtensionCommand command,
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
        reviewCase.RequestExtension(
            reviewCase.ExpertProfileId,
            command.Days,
            command.Reason,
            clock.GetUtcNow()
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
