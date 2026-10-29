using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
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
    string? ExpectedOutcome
);

/// <summary>
/// Opens the case awaiting payment with the price, fee and turnaround read from the expert service,
/// never from the client.
/// </summary>
public sealed class RequestReviewHandler(
    IDocumentRepository documents,
    IExpertOfferings offerings,
    IReviewCaseRepository cases,
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

        var offer =
            await offerings.FindAsync(command.ExpertProfileId, command.ServiceCode, ct)
            ?? throw WorkflowErrors.ExpertServiceUnavailable();
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
        }
        catch (UniqueConstraintException)
        {
            // The partial unique index also stops two bookings sent at the same moment
            throw WorkflowErrors.CaseAlreadyOpen();
        }
        return ReviewCaseResponse.From(reviewCase);
    }
}
