using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.Features.Escrows;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Holds the case fee from the client's credits.</summary>
/// <param name="UserId">The client who pays.</param>
/// <param name="Amount">The fee frozen on the case, in VND.</param>
public sealed record HoldCaseEscrowRequest(
    [Required] Guid? UserId,
    [Range(1, long.MaxValue)] long Amount
)
{
    public HoldCaseEscrowCommand ToCommand(Guid reviewCaseId) =>
        new(UserId!.Value, reviewCaseId, Amount);
}

/// <summary>The split of a completed case; the three amounts must add up to the held fee.</summary>
/// <param name="ExpertUserId">The expert's account id (receives the payout).</param>
public sealed record SettleCaseEscrowRequest(
    [Required] Guid? ExpertUserId,
    [Range(0, long.MaxValue)] long UserRefund,
    [Range(0, long.MaxValue)] long PlatformFee,
    [Range(0, long.MaxValue)] long ExpertPayout
)
{
    public SettleCaseEscrowCommand ToCommand(Guid reviewCaseId) =>
        new(reviewCaseId, ExpertUserId!.Value, UserRefund, PlatformFee, ExpertPayout);
}
