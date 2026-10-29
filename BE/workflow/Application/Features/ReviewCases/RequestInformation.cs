using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert asks the client for missing information during the review.</summary>
public sealed record RequestInformationCommand(Guid UserId, Guid ReviewCaseId, string? Message);

/// <summary>Pauses the review until the client answers or the information window ends.</summary>
public sealed class RequestInformationHandler(
    IReviewCaseRepository cases,
    IInfoRequestRepository infoRequests,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RequestInformationCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        RequestInformationCommand command,
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

        var (request, paused) = reviewCase.RequestInformation(
            reviewCase.ExpertProfileId,
            command.UserId,
            command.Message,
            clock.GetUtcNow()
        );
        infoRequests.Add(request);
        cases.AddHistory(paused);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // After the commit, so the client is never told about a question that was rolled back
        await events.InfoRequestedAsync(reviewCase, request, ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
