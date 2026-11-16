using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>A system admin needs more time on a dispute.</summary>
public sealed record ExtendDisputeCommand(Guid ReviewCaseId);

/// <summary>Adds one more decision window, once per dispute.</summary>
public sealed class ExtendDisputeHandler(IReviewDisputeRepository disputes, IUnitOfWork unitOfWork)
    : ICommandHandler<ExtendDisputeCommand, DisputeResponse>
{
    public async Task<DisputeResponse> HandleAsync(
        ExtendDisputeCommand command,
        CancellationToken ct
    )
    {
        var dispute =
            await disputes.FindByCaseAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.DisputeNotFound();
        dispute.Extend();
        await unitOfWork.SaveChangesAsync(ct);
        return DisputeResponse.From(dispute);
    }
}
