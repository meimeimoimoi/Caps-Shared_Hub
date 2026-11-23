using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.Features.AiCredits;

namespace Caps.Billing.Api.DTOs.Requests;

/// <summary>Holds credits from the user's wallet for an AI operation.</summary>
/// <param name="UserId">The owner of the wallet being charged.</param>
/// <param name="Amount">Amount of credits (in VND) to hold.</param>
/// <param name="Note">Optional ledger description recorded with the hold.</param>
public sealed record HoldAiCreditRequest(
    [Required] Guid? UserId,
    [Range(1, long.MaxValue)] long Amount,
    [MaxLength(200)] string? Note = null
)
{
    public HoldAiCreditCommand ToCommand(Guid aiUsageId) =>
        new(UserId!.Value, aiUsageId, Amount, Note);
}

/// <summary>Captures held credits once the AI operation finishes.</summary>
/// <param name="DocumentVersionId">Optional generated draft version id linked to the ledger entry.</param>
/// <param name="Note">Optional ledger description recorded with the capture.</param>
public sealed record CaptureAiCreditRequest(
    Guid? DocumentVersionId = null,
    [MaxLength(200)] string? Note = null
)
{
    public CaptureAiCreditCommand ToCommand(Guid aiUsageId) =>
        new(aiUsageId, DocumentVersionId, Note);
}

/// <summary>Releases held credits back to the user's spendable balance.</summary>
/// <param name="Note">Optional ledger description recorded with the release.</param>
public sealed record ReleaseAiCreditRequest([MaxLength(200)] string? Note = null)
{
    public ReleaseAiCreditCommand ToCommand(Guid aiUsageId) => new(aiUsageId, Note);
}
