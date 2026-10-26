using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client answers the expert's open question.</summary>
public sealed record ProvideInformationCommand(Guid UserId, Guid ReviewCaseId, string? Message);

/// <summary>Resumes the review; the delivery deadline moves back by the time spent waiting.</summary>
public sealed class ProvideInformationHandler(
    IReviewCaseRepository cases,
    IInfoRequestRepository infoRequests,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ProvideInformationCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        ProvideInformationCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.EnsureRequester(command.UserId);
        var request =
            await infoRequests.FindOpenForUpdateAsync(reviewCase.Id, ct)
            ?? throw WorkflowErrors.InfoRequestClosed();

        var resumed = reviewCase.ProvideInformation(
            request,
            command.UserId,
            command.Message,
            clock.GetUtcNow()
        );
        cases.AddHistory(resumed);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
