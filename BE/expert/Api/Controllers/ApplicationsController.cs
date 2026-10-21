using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Applications;
using Caps.Expert.Domain.Applications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// The signed-in user's own expert application. Unverified accounts can still save drafts
/// and upload files; only submitting and supplementing require a verified email.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/application")]
public sealed class ApplicationsController(ICurrentUser currentUser) : ControllerBase
{
    private const long UploadLimit = ApplicationRules.MaxFileBytes + (64 * 1024);

    private Applicant Applicant => Applicant.From(currentUser);

    private static OkObjectResult Result(ExpertApplicationResponse? data) =>
        new(ApiResponse<ExpertApplicationResponse?>.Ok(data));

    /// <summary>Returns the signed-in user's latest expert application.</summary>
    /// <response code="200">The application with its files, history and missing requirements; data = null when none exists.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetMyApplicationQuery, ExpertApplicationResponse?> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(new(Applicant), ct);
        return Result(application);
    }

    /// <summary>Saves the application as a draft (creates it on first save). Every field may be empty.</summary>
    /// <remarks>Name and phone are kept with the application; they do not change the account profile.</remarks>
    /// <response code="200">The saved draft.</response>
    /// <response code="400">INVALID_FIELD or INVALID_BIRTH_DATE.</response>
    /// <response code="409">APPLICATION_LOCKED (already submitted) or REAPPLY_TOO_EARLY.</response>
    [HttpPut]
    public async Task<IActionResult> Save(
        SaveExpertApplicationRequest r,
        [FromServices] ICommandHandler<SaveDraftCommand, ExpertApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(r.ToCommand(Applicant), ct);
        return Result(application);
    }

    /// <summary>Uploads one evidence file (multipart fields <c>code</c> and <c>file</c>).</summary>
    /// <remarks>Codes: CV, EV-01…EV-05, or SUPPLEMENT while more information is requested. PDF, PNG or JPG up to 10 MB, at most 20 files (3 until the email is verified).</remarks>
    /// <response code="200">The application with the new file.</response>
    /// <response code="400">EVIDENCE_REQUIRED, EVIDENCE_TOO_LARGE, EVIDENCE_INVALID_TYPE, INVALID_EVIDENCE_CODE (unknown group) or SUPPLEMENT_NOT_REQUESTED.</response>
    /// <response code="403">EVIDENCE_LIMIT_UNVERIFIED: at most 3 files until the email is verified (refresh the session after verifying).</response>
    /// <response code="409">EVIDENCE_LIMIT or APPLICATION_LOCKED.</response>
    [HttpPost("evidence")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> AddEvidence(
        [FromForm] string? code,
        IFormFile? file,
        [FromServices] ICommandHandler<AddEvidenceCommand, ExpertApplicationResponse> handler,
        CancellationToken ct
    )
    {
        // Size and format are validated by the domain from the bytes themselves
        await using var buffer = new MemoryStream();
        if (file != null)
            await file.CopyToAsync(buffer, ct);
        var command = new AddEvidenceCommand(
            Applicant,
            code ?? "",
            file?.FileName ?? "",
            buffer.ToArray()
        );
        var application = await handler.HandleAsync(command, ct);
        return Result(application);
    }

    /// <summary>Adds a public CV or supporting evidence link.</summary>
    /// <remarks>JSON fields: code (CV, EV-01…EV-05, or SUPPLEMENT) and sourceUrl. HTTP(S) URLs only, at most 2048 characters. Links share file limits and submission rules. The server does not download or verify remote content.</remarks>
    /// <response code="200">The application with the new link.</response>
    /// <response code="400">EVIDENCE_INVALID_URL, INVALID_EVIDENCE_CODE or SUPPLEMENT_NOT_REQUESTED.</response>
    /// <response code="403">EVIDENCE_LIMIT_UNVERIFIED.</response>
    /// <response code="409">EVIDENCE_DUPLICATE, EVIDENCE_LIMIT or APPLICATION_LOCKED.</response>
    [HttpPost("evidence/link")]
    public async Task<IActionResult> AddEvidenceLink(
        AddEvidenceLinkRequest request,
        [FromServices] ICommandHandler<AddEvidenceLinkCommand, ExpertApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var command = new AddEvidenceLinkCommand(Applicant, request.Code ?? "", request.SourceUrl);
        var application = await handler.HandleAsync(command, ct);
        return Result(application);
    }

    /// <summary>Removes a file or link that has not been submitted yet.</summary>
    /// <response code="200">The application without the file.</response>
    /// <response code="404">EVIDENCE_NOT_FOUND or APPLICATION_NOT_FOUND.</response>
    /// <response code="409">EVIDENCE_LOCKED: submitted files are kept as history.</response>
    [HttpDelete("evidence/{id:guid}")]
    public async Task<IActionResult> RemoveEvidence(
        Guid id,
        [FromServices] ICommandHandler<RemoveEvidenceCommand, ExpertApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(new(Applicant, id), ct);
        return Result(application);
    }

    /// <summary>Downloads one of the applicant's own files.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="404">EVIDENCE_NOT_FOUND (also for other users' files).</response>
    [HttpGet("evidence/{id:guid}/file")]
    public async Task<IActionResult> OpenEvidence(
        Guid id,
        [FromServices] IQueryHandler<OpenEvidenceQuery, ExpertEvidenceFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(currentUser.RequireUserId(), id), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }

    /// <summary>Submits the draft for review.</summary>
    /// <remarks>Requires a verified email (refresh the session after verifying), phone, years of experience, at least one field and a CV.</remarks>
    /// <response code="200">The submitted application.</response>
    /// <response code="400">APPLICATION_INCOMPLETE (missing items listed in the message).</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">APPLICATION_NOT_FOUND.</response>
    /// <response code="409">APPLICATION_LOCKED.</response>
    [HttpPost("submit")]
    public async Task<IActionResult> Submit(
        [FromServices] ICommandHandler<SubmitApplicationCommand, ExpertApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(new(Applicant), ct);
        return Result(application);
    }

    /// <summary>Sends the extra information a reviewer asked for (explanation and/or new files).</summary>
    /// <response code="200">The application, back in the review queue.</response>
    /// <response code="400">SUPPLEMENT_EMPTY: add an explanation or at least one new file.</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">APPLICATION_NOT_FOUND.</response>
    /// <response code="409">APPLICATION_LOCKED: no information was requested.</response>
    [HttpPost("supplement")]
    public async Task<IActionResult> Supplement(
        SupplementExpertApplicationRequest r,
        [FromServices]
            ICommandHandler<SupplementApplicationCommand, ExpertApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(new(Applicant, r.Note), ct);
        return Result(application);
    }
}
