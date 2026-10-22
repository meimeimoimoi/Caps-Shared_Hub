using System.ComponentModel.DataAnnotations;
using Caps.Expert.Application.Features.Policies;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>New policy values by key (MinYearsExperience, ReapplyNotEligibleDays, ReapplyCompetencyFailDays) and why.</summary>
/// <param name="Values">Only keys present are changed; a value equal to the current one is ignored.</param>
/// <param name="Expected">For every key in Values, the value read before editing; a mismatch returns POLICY_CHANGED.</param>
/// <param name="Reason">Required; recorded with every change.</param>
public sealed record UpdateExpertPolicyRequest(
    [Required] Dictionary<string, int> Values,
    [Required] Dictionary<string, int> Expected,
    [MaxLength(1000)] string? Reason
)
{
    public UpdateExpertPolicyCommand ToCommand(Guid actorUserId) =>
        new(actorUserId, Values, Expected, Reason);
}
