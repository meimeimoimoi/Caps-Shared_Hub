using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>The workflow service returns a review case's fee (declined, expired or cancelled case).</summary>
public sealed record RefundCaseEscrowCommand(Guid ReviewCaseId);

/// <summary>
/// Refunds through the existing handler; an escrow already refunded counts as done, one already paid out
/// to the expert still fails.
/// </summary>
public sealed class RefundCaseEscrowHandler(
    ICommandHandler<RefundEscrowCommand, SettlementResponse> refund,
    IEscrowRepository escrows
) : ICommandHandler<RefundCaseEscrowCommand>
{
    public async Task HandleAsync(RefundCaseEscrowCommand command, CancellationToken ct)
    {
        try
        {
            await refund.HandleAsync(new(command.ReviewCaseId), ct);
        }
        catch (AppException e) when (e.Code == "ESCROW_NOT_HELD")
        {
            var existing = await escrows.LockByReviewCaseAsync(command.ReviewCaseId, ct);
            if (existing?.Status != EscrowStatus.Refunded)
            {
                throw;
            }
        }
    }
}
