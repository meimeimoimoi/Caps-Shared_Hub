using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Qualifications;
using Caps.Expert.Domain.Applications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// The signed-in expert's service registrations (Gate 2). Gate 2 is decided per Expert–Service: after
/// Gate 1 ELIGIBLE the expert registers each service separately. Files the expert already uploaded are
/// opened through <c>GET /api/v1/experts/me/application/evidence/{id}/file</c>.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/qualifications")]
public sealed class QualificationsController(ICurrentUser currentUser) : ControllerBase
{
    private const long UploadLimit = ApplicationRules.MaxFileBytes + (64 * 1024);

    private Applicant Applicant => Applicant.From(currentUser);

    private static OkObjectResult Result(ExpertQualificationResponse data) =>
        new(ApiResponse<ExpertQualificationResponse>.Ok(data));

    /// <summary>Lists the active services with the expert's latest qualification for each.</summary>
    /// <response code="200">One entry per service; canRegister tells whether it can be registered now.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices]
            IQueryHandler<ListMyQualificationsQuery, ExpertQualificationsResponse> handler,
        CancellationToken ct
    )
    {
        var services = await handler.HandleAsync(new(Applicant), ct);
        return Ok(ApiResponse<ExpertQualificationsResponse>.Ok(services));
    }

    /// <summary>Returns one qualification with its files, history and latest Gate 2 results.</summary>
    /// <response code="200">The qualification.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND (also for another account's qualification).</response>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices] IQueryHandler<GetMyQualificationQuery, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(Applicant, id), ct);
        return Result(qualification);
    }

    /// <summary>Registers for a service; the qualification starts in PREPARING.</summary>
    /// <remarks>
    /// Requires Gate 1 ELIGIBLE. The expert then adds competency evidence and submits it. While the catalog
    /// offers a single service it is registered automatically when Gate 1 passes, so this is only needed when
    /// that was skipped. After FAIL the same service can be registered again only once earliestReapplyAt has
    /// passed (90 days by policy); the new qualification links to the failed one and waits for new evidence
    /// in NEED_MORE_INFORMATION.
    /// </remarks>
    /// <response code="200">The new qualification.</response>
    /// <response code="404">SERVICE_NOT_FOUND: unknown or inactive service.</response>
    /// <response code="409">ELIGIBILITY_REQUIRED, QUALIFICATION_EXISTS or REAPPLY_TOO_EARLY.</response>
    [HttpPost]
    public async Task<IActionResult> Register(
        RegisterForServiceRequest r,
        [FromServices]
            ICommandHandler<RegisterForServiceCommand, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(r.ToCommand(Applicant), ct);
        return Result(qualification);
    }

    /// <summary>Uploads one competency evidence file (PDF, PNG or JPG, at most 10 MB).</summary>
    /// <remarks>
    /// Only while the qualification is PREPARING or NEED_MORE_INFORMATION; the format is checked from the
    /// bytes. Repeat the competencies form field for each competency (C1…C5) the file supports.
    /// </remarks>
    /// <response code="200">The qualification with the new file.</response>
    /// <response code="400">EVIDENCE_REQUIRED, EVIDENCE_TOO_LARGE, EVIDENCE_INVALID_TYPE, EVIDENCE_COMPETENCY_REQUIRED or INVALID_COMPETENCY_CODE.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED or EVIDENCE_LIMIT.</response>
    [HttpPost("{id:guid}/evidence")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> AddEvidence(
        Guid id,
        IFormFile? file,
        [FromForm] string[]? competencies,
        [FromServices]
            ICommandHandler<AddQualificationEvidenceCommand, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        // Size and format are validated by the domain from the bytes themselves
        await using var buffer = new MemoryStream();
        if (file != null)
            await file.CopyToAsync(buffer, ct);
        var command = new AddQualificationEvidenceCommand(
            Applicant,
            id,
            file?.FileName ?? "",
            buffer.ToArray(),
            competencies
        );
        var qualification = await handler.HandleAsync(command, ct);
        return Result(qualification);
    }

    /// <summary>Adds a public link as competency evidence; reviewers open it directly.</summary>
    /// <remarks>Same states and limit as file uploads; the link is never downloaded.</remarks>
    /// <response code="200">The qualification with the new link.</response>
    /// <response code="400">EVIDENCE_INVALID_URL, EVIDENCE_COMPETENCY_REQUIRED or INVALID_COMPETENCY_CODE.</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED or EVIDENCE_LIMIT.</response>
    [HttpPost("{id:guid}/evidence/link")]
    public async Task<IActionResult> AddEvidenceLink(
        Guid id,
        AddQualificationEvidenceLinkRequest r,
        [FromServices]
            ICommandHandler<
            AddQualificationEvidenceLinkCommand,
            ExpertQualificationResponse
        > handler,
        CancellationToken ct
    )
    {
        var command = new AddQualificationEvidenceLinkCommand(
            Applicant,
            id,
            r.SourceUrl,
            r.Competencies
        );
        var qualification = await handler.HandleAsync(command, ct);
        return Result(qualification);
    }

    /// <summary>Sets the competencies one of the expert's competency files supports.</summary>
    /// <remarks>A file already submitted can gain competencies but keeps those it was reviewed under.</remarks>
    /// <response code="200">The qualification after the change.</response>
    /// <response code="400">EVIDENCE_COMPETENCY_REQUIRED or INVALID_COMPETENCY_CODE.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND or EVIDENCE_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED or EVIDENCE_LOCKED.</response>
    [HttpPut("{id:guid}/evidence/{evidenceId:guid}/competencies")]
    public async Task<IActionResult> SetEvidenceCompetencies(
        Guid id,
        Guid evidenceId,
        EvidenceCompetenciesRequest r,
        [FromServices]
            ICommandHandler<SetEvidenceCompetenciesCommand, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var command = new SetEvidenceCompetenciesCommand(Applicant, id, evidenceId, r.Competencies);
        var qualification = await handler.HandleAsync(command, ct);
        return Result(qualification);
    }

    /// <summary>Saves the expert's short description for one competency; empty text clears it.</summary>
    /// <response code="200">The qualification after the change.</response>
    /// <response code="400">INVALID_COMPETENCY_CODE or COMPETENCY_DESCRIPTION_TOO_LONG.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED.</response>
    [HttpPut("{id:guid}/competencies/{code}/description")]
    public async Task<IActionResult> SaveDescription(
        Guid id,
        string code,
        CompetencyDescriptionRequest r,
        [FromServices]
            ICommandHandler<SaveCompetencyDescriptionCommand, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(Applicant, id, code, r.Text), ct);
        return Result(qualification);
    }

    /// <summary>Sends the prepared competency evidence for review.</summary>
    /// <remarks>PREPARING → COMPETENCY_REVIEW: the qualification joins the Gate 2 queue. Needs at least one file or link tied to a competency.</remarks>
    /// <response code="200">The qualification in COMPETENCY_REVIEW.</response>
    /// <response code="400">COMPETENCY_EVIDENCE_MISSING.</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED: not PREPARING.</response>
    [HttpPost("{id:guid}/submit")]
    public async Task<IActionResult> Submit(
        Guid id,
        [FromServices]
            ICommandHandler<SubmitQualificationCommand, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(Applicant, id), ct);
        return Result(qualification);
    }

    /// <summary>Removes a file added since the latest submission.</summary>
    /// <response code="200">The qualification without the file.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND or EVIDENCE_NOT_FOUND.</response>
    /// <response code="409">EVIDENCE_LOCKED: the file is part of a submission.</response>
    [HttpDelete("{id:guid}/evidence/{evidenceId:guid}")]
    public async Task<IActionResult> RemoveEvidence(
        Guid id,
        Guid evidenceId,
        [FromServices]
            ICommandHandler<
            RemoveQualificationEvidenceCommand,
            ExpertQualificationResponse
        > handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(Applicant, id, evidenceId), ct);
        return Result(qualification);
    }

    /// <summary>Sends the qualification back to competency review after more information was requested.</summary>
    /// <remarks>
    /// Needs a note or at least one file added since the request. A re-registration after FAIL needs a new
    /// file tied to each competency that failed.
    /// </remarks>
    /// <response code="200">The qualification, back in COMPETENCY_REVIEW.</response>
    /// <response code="400">SUPPLEMENT_EMPTY, NEW_EVIDENCE_REQUIRED or COMPETENCY_NEW_EVIDENCE_REQUIRED.</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED: no information was requested.</response>
    [HttpPost("{id:guid}/supplement")]
    public async Task<IActionResult> Supplement(
        Guid id,
        SupplementQualificationRequest r,
        [FromServices]
            ICommandHandler<SupplementQualificationCommand, ExpertQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(Applicant, id, r.Note), ct);
        return Result(qualification);
    }
}
