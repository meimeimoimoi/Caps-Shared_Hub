using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>A system admin needs more time on a dispute, and says why.</summary>
public sealed record ExtendDisputeCommand(Guid AdminUserId, Guid ReviewCaseId, string? Reason);

/// <summary>Adds one more decision window, once per dispute, and tells the client and the expert.</summary>
public sealed class ExtendDisputeHandler(
    IReviewCaseRepository cases,
    IReviewDisputeRepository disputes,
    IReviewCaseEvents events,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar? calendar = null
) : ICommandHandler<ExtendDisputeCommand, DisputeResponse>
{
    public async Task<DisputeResponse> HandleAsync(
        ExtendDisputeCommand command,
        CancellationToken ct
    )
    {
        var reviewCase =
            await cases.FindAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var dispute =
            await disputes.FindByCaseAsync(reviewCase.Id, ct)
            ?? throw WorkflowErrors.DisputeNotFound();
        dispute.Extend(command.AdminUserId, command.Reason, clock.GetUtcNow(), calendar);
        // Writen to the outbox in the same save, so the parties are told only if the extension holds
        await events.DisputeExtendedAsync(reviewCase, dispute, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return DisputeResponse.From(dispute);
    }
}
