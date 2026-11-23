using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.Features.Escrows;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Pays a held escrow to the expert.</summary>
/// <param name="ExpertUserId">The expert's account id (receives the payout).</param>
/// <param name="PlatformFeePct">Platform share in percent, 0 to 100; the expert gets the rest.</param>
public sealed record ReleaseEscrowRequest(
    [Required] Guid? ExpertUserId,
    [Range(0, 100)] int PlatformFeePct
)
{
    public ReleaseEscrowCommand ToCommand(Guid reviewCaseId) =>
        new(reviewCaseId, ExpertUserId!.Value, PlatformFeePct);
}
