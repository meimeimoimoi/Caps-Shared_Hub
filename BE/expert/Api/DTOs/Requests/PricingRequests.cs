using System.ComponentModel.DataAnnotations;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Approvals;
using Caps.Expert.Application.Features.Pricing;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>The expert's price for one service; Submit sends it for (auto-)approval.</summary>
/// <param name="Amount">Price in VND, within the service price range.</param>
/// <param name="EffectiveFrom">First day the price applies (Vietnam date), not in the past.</param>
/// <param name="Reason">Why the price is set or changed; required to submit.</param>
/// <param name="Revision">The workspace revision being edited (optimistic concurrency).</param>
public sealed record SavePricingRequest(
    [Range(1, long.MaxValue)] long Amount,
    DateOnly EffectiveFrom,
    [MaxLength(1000)] string? Reason,
    [Range(0, int.MaxValue)] int Revision,
    bool Submit
)
{
    public SaveMyPricingCommand ToCommand(Applicant applicant, string serviceCode) =>
        new(applicant, serviceCode, Amount, EffectiveFrom, Reason, Revision, Submit);
}

/// <summary>APPROVE, RETURN_FOR_REVISION or REJECT; the note is required unless approving.</summary>
public sealed record PricingDecisionRequest(
    [Required, MaxLength(32)] string Decision,
    [MaxLength(2000)] string? Note
)
{
    public DecidePricingCommand ToCommand(Guid adminUserId, Guid versionId) =>
        new(adminUserId, versionId, Decision, Note);
}
