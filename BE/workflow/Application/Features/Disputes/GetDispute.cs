using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Disputes;

/// <summary>A case's dispute seen by one of its parties.</summary>
public sealed record GetDisputeQuery(Guid UserId, Guid ReviewCaseId);

/// <summary>Returns the dispute to the case's client or expert; to anyone else the case does not exist.</summary>
public sealed class GetDisputeHandler(
    IReviewCaseRepository cases,
    IReviewDisputeRepository disputes
) : IQueryHandler<GetDisputeQuery, DisputeResponse>
{
    public async Task<DisputeResponse> HandleAsync(GetDisputeQuery query, CancellationToken ct)
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.EnsureVisibleTo(query.UserId);
        var dispute =
            await disputes.FindByCaseAsync(reviewCase.Id, ct)
            ?? throw WorkflowErrors.DisputeNotFound();
        return DisputeResponse.From(dispute);
    }
}
