using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client accepts or declines the expert's extension request.</summary>
public sealed record DecideExtensionCommand(Guid UserId, Guid ReviewCaseId, bool Accept);

/// <summary>Accepting moves the delivery deadline by the working days asked; declining keeps it.</summary>
public sealed class DecideExtensionHandler(
    IReviewCaseRepository cases,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar? calendar = null
) : ICommandHandler<DecideExtensionCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        DecideExtensionCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.DecideExtension(command.UserId, command.Accept, clock.GetUtcNow(), calendar);
        // Saved with the step: the outbox sends it only once this transaction commits
        await events.ExtensionDecidedAsync(reviewCase, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase, command.UserId);
    }
}
