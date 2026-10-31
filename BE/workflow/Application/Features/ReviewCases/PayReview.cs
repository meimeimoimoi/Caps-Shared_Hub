using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The client pays the case fee from their credits.</summary>
public sealed record PayReviewCommand(Guid UserId, Guid ReviewCaseId);

/// <summary>
/// Holds the frozen fee in billing escrow and sends the case to the expert.
/// The domain step runs first, so an expired or already paid case never touches the client's credits.
/// </summary>
public sealed class PayReviewHandler(
    IReviewCaseRepository cases,
    IExpertOfferings offerings,
    IEscrows escrows,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<PayReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        PayReviewCommand command,
        CancellationToken ct
    )
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.EnsureRequester(command.UserId);
        var paid = reviewCase.ConfirmPayment(clock.GetUtcNow());
        //Suspended, unpriced or full since booking: paying would only end in a refund at the response deadline
        if (
            reviewCase.ServiceCode is { } serviceCode
            && await offerings.FindAsync(reviewCase.ExpertProfileId, serviceCode, ct) is null
        )
        {
            throw WorkflowErrors.ExpertServiceUnavailable();
        }

        // Billing allows one escrow per case, so a double click fails there instead of paying twice
        await escrows.HoldAsync(command.UserId, reviewCase.Id, reviewCase.Fee, ct);
        cases.AddHistory(paid);
        // a failed save after the hold leaves credits held; the expiry job refunds it
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // After the commit, so the expert is never told about a payment that rolled back
        await events.RequestedAsync(reviewCase, ct);
        return ReviewCaseResponse.From(reviewCase);
    }
}
