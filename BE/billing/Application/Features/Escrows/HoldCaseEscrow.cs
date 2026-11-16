using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>The workflow service holds a review case's fee when the client pays.</summary>
public sealed record HoldCaseEscrowCommand(Guid UserId, Guid ReviewCaseId, long Amount);

/// <summary>
/// Holds through the existing handler; a retry after a lost reply finds the same hold and succeeds, so the
/// workflow can safely repeat a timed-out payment. A different hold for the case still fails.
/// </summary>
public sealed class HoldCaseEscrowHandler(
    ICommandHandler<HoldEscrowCommand, EscrowResponse> hold,
    IEscrowRepository escrows
) : ICommandHandler<HoldCaseEscrowCommand>
{
    public async Task HandleAsync(HoldCaseEscrowCommand command, CancellationToken ct)
    {
        try
        {
            await hold.HandleAsync(new(command.UserId, command.ReviewCaseId, command.Amount), ct);
        }
        catch (AppException e) when (e.Code == "ESCROW_ALREADY_EXISTS")
        {
            var existing = await escrows.LockByReviewCaseAsync(command.ReviewCaseId, ct);
            var sameHold =
                existing is { Status: EscrowStatus.Held }
                && existing.UserId == command.UserId
                && existing.Amount == command.Amount;
            if (!sameHold)
            {
                throw;
            }
        }
    }
}
