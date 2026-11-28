using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>A client asks an expert to review one version of their document.</summary>
public sealed record RequestReviewCommand(
    Guid UserId,
    string? UserEmail,
    Guid DocumentId,
    Guid SourceVersionId,
    Guid ExpertProfileId,
    string ServiceCode,
    string? ProblemDescription,
    string? ExpectedOutcome,
    long? ExpectedFee = null
);

/// <summary>
/// Opens the case awaiting payment with the price, fee and turnaround read from the expert service,
/// never from the client.
/// </summary>
public sealed class RequestReviewHandler(
    IDocumentRepository documents,
    IExpertOfferings offerings,
    IReviewCaseRepository cases,
    IReviewCaseLookup openCases,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RequestReviewCommand, ReviewCaseResponse>
{
    public async Task<ReviewCaseResponse> HandleAsync(
        RequestReviewCommand command,
        CancellationToken ct
    )
    {
        //Local check first, so a wrong document never costs a call to the expert service
        if (
            !await documents.OwnsVersionAsync(
                command.UserId,
                command.DocumentId,
                command.SourceVersionId,
                ct
            )
        )
        {
            throw WorkflowErrors.DocumentNotFound();
        }

        // BR-G02: one running case per document, whatever the version or the expert. The document row stays
        // locked until the commit, so a booking sent at the same moment waits and then sees this case
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        if (await openCases.HasOpenCaseForUpdateAsync(command.DocumentId, ct))
        {
            throw WorkflowErrors.CaseAlreadyOpen();
        }

        var offer =
            await offerings.FindAsync(command.ExpertProfileId, command.ServiceCode, ct)
            ?? throw WorkflowErrors.ExpertServiceUnavailable();

        // BR-M35: book the price the client saw; one changed meanwhile is never booked silently
        if (command.ExpectedFee is { } seen && seen != offer.Fee)
        {
            throw WorkflowErrors.PriceChanged(seen, offer.Fee);
        }
        var (reviewCase, opened) = ReviewCase.Request(
            command.UserId,
            command.UserEmail,
            command.DocumentId,
            command.SourceVersionId,
            offer,
            command.ProblemDescription,
            command.ExpectedOutcome,
            clock.GetUtcNow()
        );
        cases.Add(reviewCase);
        cases.AddHistory(opened);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Two bookings of the same version sent at the same moment: the partial unique index stops the second
            throw WorkflowErrors.CaseAlreadyOpen();
        }
        return ReviewCaseResponse.From(reviewCase, command.UserId);
    }
}
