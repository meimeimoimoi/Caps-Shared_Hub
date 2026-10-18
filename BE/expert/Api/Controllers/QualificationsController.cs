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

    /// <summary>Registers for a service; the qualification starts in COMPETENCY_REVIEW.</summary>
    /// <remarks>
    /// Requires Gate 1 ELIGIBLE. After FAIL the same service can be registered again only once
    /// earliestReapplyAt has passed (90 days by policy); the new qualification links to the failed one.
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
    /// <remarks>Only while the qualification is NEED_MORE_INFORMATION; the format is checked from the bytes.</remarks>
    /// <response code="200">The qualification with the new file.</response>
    /// <response code="400">EVIDENCE_REQUIRED, EVIDENCE_TOO_LARGE or EVIDENCE_INVALID_TYPE.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_LOCKED or EVIDENCE_LIMIT.</response>
    [HttpPost("{id:guid}/evidence")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> AddEvidence(
        Guid id,
        IFormFile? file,
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
            buffer.ToArray()
        );
        var qualification = await handler.HandleAsync(command, ct);
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
    /// <remarks>Needs a note or at least one file added since the request.</remarks>
    /// <response code="200">The qualification, back in COMPETENCY_REVIEW.</response>
    /// <response code="400">SUPPLEMENT_EMPTY.</response>
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
