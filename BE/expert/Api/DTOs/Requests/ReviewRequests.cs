using System.ComponentModel.DataAnnotations;
using Caps.Expert.Application.Features.Reviews;
using Caps.Expert.Domain.Applications;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>
/// Gate 1 decision: one result per requirement EV-01…EV-06. The outcome is derived from them
/// (any FAIL → NOT_ELIGIBLE, else any NEED_MORE_INFORMATION → NEED_MORE_INFORMATION, else ELIGIBLE).
/// </summary>
public sealed record EligibilityDecisionRequest(
    [Required, MaxLength(6)] EligibilityCriterionRequest[] Criteria,
    [MaxLength(2000)] string? Note
)
{
    public DecideEligibilityCommand ToCommand(Guid reviewerUserId, Guid applicationId) =>
        new(
            reviewerUserId,
            applicationId,
            Criteria.Select(x => new CriterionResult(x.Code, x.Result, x.Note)).ToArray(),
            Note
        );
}

/// <summary>Result of one requirement; the note is required unless the result is PASS.</summary>
public sealed record EligibilityCriterionRequest(
    [Required, MaxLength(16)] string Code,
    [Required, MaxLength(32)] string Result,
    [MaxLength(2000)] string? Note
);
