using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>A system admin suspended one of the expert's services (expert service event).</summary>
public sealed record RefundSuspendedServiceCommand(Guid ExpertUserId, string ServiceCode);

/// <summary>Refunds that service's paid requests the expert has not accepted; accepted cases finish as usual.</summary>
public sealed class RefundSuspendedServiceHandler(
    IReviewCaseRepository cases,
    WaitingRequestRefunds refunds
) : ICommandHandler<RefundSuspendedServiceCommand>
{
    public async Task HandleAsync(RefundSuspendedServiceCommand command, CancellationToken ct)
    {
        var waiting = await cases.ListPendingIdsAsync(
            command.ExpertUserId,
            command.ServiceCode,
            ct
        );
        await refunds.RefundAsync(waiting, ReviewCase.ServiceSuspended, ct);
    }
}
