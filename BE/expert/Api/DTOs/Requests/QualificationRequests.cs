using System.ComponentModel.DataAnnotations;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Qualifications;
using Caps.Expert.Application.Features.Reviews;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>Registers for one catalog service, e.g. HUMAN_VERIFICATION.</summary>
public sealed record RegisterForServiceRequest([Required, MaxLength(64)] string ServiceCode)
{
    public RegisterForServiceCommand ToCommand(Applicant applicant) => new(applicant, ServiceCode);
}

/// <summary>Sends the qualification back to competency review, with an optional note.</summary>
public sealed record SupplementQualificationRequest([MaxLength(2000)] string? Note);

/// <summary>
/// Gate 2 decision: one result per competency C1…C5. The outcome is derived from them
/// (any FAIL → FAIL, else any NEED_MORE_INFORMATION → NEED_MORE_INFORMATION, else PENDING_FINAL_APPROVAL).
/// </summary>
public sealed record CompetencyDecisionRequest(
    [Required, MaxLength(5)] CompetencyResultRequest[] Competencies,
    [MaxLength(2000)] string? Note
)
{
    public DecideCompetencyCommand ToCommand(Guid reviewerUserId, Guid qualificationId) =>
        new(
            reviewerUserId,
            qualificationId,
            Competencies
                .Select(x => new CompetencyResult(x.Code, x.Result, x.Note, x.EvidenceIds ?? []))
                .ToArray(),
            Note
        );
}

/// <summary>Result of one competency with its note and the files it relies on.</summary>
/// <param name="Note">Required for every result (COMPETENCY_NOTE_REQUIRED otherwise).</param>
/// <param name="EvidenceIds">Required for PASS and FAIL; may be empty for NEED_MORE_INFORMATION.</param>
public sealed record CompetencyResultRequest(
    [Required, MaxLength(8)] string Code,
    [Required, MaxLength(32)] string Result,
    [MaxLength(2000)] string? Note,
    [MaxLength(50)] Guid[]? EvidenceIds
);
