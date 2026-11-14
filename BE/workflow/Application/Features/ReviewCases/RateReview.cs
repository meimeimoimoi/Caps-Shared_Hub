using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client rates the expert after the case is over.</summary>
public sealed record RateReviewCommand(Guid UserId, Guid ReviewCaseId, int Stars, string? Comment);

/// <summary>Counts the stars at the expert service, then saves the rating; an unreachable expert service saves nothing.</summary>
public sealed class RateReviewHandler(
    IReviewCaseRepository cases,
    IExpertRatings ratings,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RateReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        RateReviewCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.Rate(command.UserId, command.Stars, command.Comment, clock.GetUtcNow());
        // a failed save after the expert counted lets the client retry; the expert keep the first
        // stars it got for the case, so a retry with other stars shows them here but  not in the average
        await ratings.RecordAsync(
            reviewCase.ExpertProfileId,
            reviewCase.Id,
            (short)command.Stars,
            ct
        );
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
