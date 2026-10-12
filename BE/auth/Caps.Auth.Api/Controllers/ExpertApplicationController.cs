using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions;
using Caps.Auth.Application.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Experts;
using Caps.Auth.Domain.Users;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>
/// The signed-in user's own expert application. Unverified accounts can still save drafts
/// and upload files; only submitting and supplementing require a verified email.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/application")]
public sealed class ExpertApplicationController(
    IExpertApplicationService applications,
    ICurrentUser currentUser
) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    private static OkObjectResult Result(ExpertApplicationResponse? data) =>
        new(ApiResponse<ExpertApplicationResponse?>.Ok(data));

    /// <summary>Returns the signed-in user's latest expert application.</summary>
    /// <response code="200">The application with its files, history and missing requirements; data = null when none exists.</response>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var application = await applications.GetAsync(UserId, ct);
        return Result(application);
    }

    /// <summary>Saves the application as a draft (creates it on first save). Every field may be empty.</summary>
    /// <response code="200">The saved draft.</response>
    /// <response code="400">INVALID_FIELD or INVALID_BIRTH_DATE.</response>
    /// <response code="409">APPLICATION_LOCKED (already submitted) or REAPPLY_TOO_EARLY.</response>
    [HttpPut]
    public async Task<IActionResult> Save(SaveExpertApplicationRequest r, CancellationToken ct)
    {
        var application = await applications.SaveDraftAsync(UserId, r, ct);
        return Result(application);
    }

    /// <summary>Uploads one evidence file (multipart fields <c>code</c> and <c>file</c>).</summary>
    /// <remarks>Codes: CV, EV-01…EV-05, or SUPPLEMENT while more information is requested. PDF, PNG or JPG up to 10 MB, at most 20 files.</remarks>
    /// <response code="200">The application with the new file.</response>
    /// <response code="400">EVIDENCE_REQUIRED, EVIDENCE_TOO_LARGE, EVIDENCE_INVALID_TYPE or INVALID_EVIDENCE_CODE.</response>
    /// <response code="409">EVIDENCE_LIMIT or APPLICATION_LOCKED.</response>
    [HttpPost("evidence")]
    [RequestSizeLimit(ExpertApplicationRules.MaxFileBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = ExpertApplicationRules.MaxFileBytes + 64 * 1024)]
    public async Task<IActionResult> AddEvidence(
        [FromForm] string? code,
        IFormFile? file,
        CancellationToken ct
    )
    {
        if (file == null || file.Length == 0)
            throw new AppException(ErrorType.Validation, "EVIDENCE_REQUIRED", "File is required.");
        if (file.Length > ExpertApplicationRules.MaxFileBytes)
            throw new AppException(
                ErrorType.Validation,
                "EVIDENCE_TOO_LARGE",
                "File must be 10 MB or smaller."
            );
        using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, ct);
        var application = await applications.AddEvidenceAsync(
            UserId,
            code ?? "",
            file.FileName,
            buffer.ToArray(),
            ct
        );
        return Result(application);
    }

    /// <summary>Removes a file that has not been submitted yet.</summary>
    /// <response code="200">The application without the file.</response>
    /// <response code="404">EVIDENCE_NOT_FOUND or APPLICATION_NOT_FOUND.</response>
    /// <response code="409">EVIDENCE_LOCKED: submitted files are kept as history.</response>
    [HttpDelete("evidence/{id:guid}")]
    public async Task<IActionResult> RemoveEvidence(Guid id, CancellationToken ct)
    {
        var application = await applications.RemoveEvidenceAsync(UserId, id, ct);
        return Result(application);
    }

    /// <summary>Downloads one of the applicant's own files.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="404">EVIDENCE_NOT_FOUND (also for other users' files).</response>
    [HttpGet("evidence/{id:guid}/file")]
    public async Task<IActionResult> OpenEvidence(Guid id, CancellationToken ct)
    {
        var file = await applications.OpenEvidenceAsync(UserId, id, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }

    /// <summary>Submits the draft for review.</summary>
    /// <remarks>Requires a verified email, phone, years of experience, at least one field and a CV.</remarks>
    /// <response code="200">The submitted application.</response>
    /// <response code="400">APPLICATION_INCOMPLETE (missing items listed in the message).</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">APPLICATION_NOT_FOUND.</response>
    /// <response code="409">APPLICATION_LOCKED.</response>
    [HttpPost("submit")]
    public async Task<IActionResult> Submit(CancellationToken ct)
    {
        var application = await applications.SubmitAsync(UserId, ct);
        return Result(application);
    }

    /// <summary>Sends the extra information a reviewer asked for (explanation and/or new files).</summary>
    /// <response code="200">The application, back in the review queue.</response>
    /// <response code="400">SUPPLEMENT_EMPTY: add an explanation or at least one new file.</response>
    /// <response code="404">APPLICATION_NOT_FOUND.</response>
    /// <response code="409">APPLICATION_LOCKED: no information was requested.</response>
    [HttpPost("supplement")]
    public async Task<IActionResult> Supplement(
        SupplementExpertApplicationRequest r,
        CancellationToken ct
    )
    {
        var application = await applications.SupplementAsync(UserId, r, ct);
        return Result(application);
    }
}
