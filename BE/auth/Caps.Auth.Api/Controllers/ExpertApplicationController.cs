using System.Security.Claims;
using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions;
using Caps.Auth.Application.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Experts;
using Caps.Auth.Domain.Users;
using Caps.Common.Api;
using Caps.Common.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>
/// The signed-in user's own expert application. Unverified accounts can still save drafts
/// and upload files; only submitting and supplementing require a verified email.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/application")]
public sealed class ExpertApplicationController(IExpertApplicationService applications)
    : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("sub")!);

    private static OkObjectResult Result(ExpertApplicationResponse? data) =>
        new(ApiResponse<ExpertApplicationResponse?>.Ok(data));

    /// <summary>data = null when no application has been created yet.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Result(await applications.GetAsync(UserId, ct));

    [HttpPut]
    public async Task<IActionResult> Save(SaveExpertApplicationRequest r, CancellationToken ct) =>
        Result(await applications.SaveDraftAsync(UserId, r, ct));

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
        return Result(
            await applications.AddEvidenceAsync(
                UserId,
                code ?? "",
                file.FileName,
                buffer.ToArray(),
                ct
            )
        );
    }

    [HttpDelete("evidence/{id:guid}")]
    public async Task<IActionResult> RemoveEvidence(Guid id, CancellationToken ct) =>
        Result(await applications.RemoveEvidenceAsync(UserId, id, ct));

    [HttpGet("evidence/{id:guid}/file")]
    public async Task<IActionResult> OpenEvidence(Guid id, CancellationToken ct)
    {
        var file = await applications.OpenEvidenceAsync(UserId, id, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }

    [HttpPost("submit")]
    public async Task<IActionResult> Submit(CancellationToken ct) =>
        Result(await applications.SubmitAsync(UserId, ct));

    [HttpPost("supplement")]
    public async Task<IActionResult> Supplement(
        SupplementExpertApplicationRequest r,
        CancellationToken ct
    ) => Result(await applications.SupplementAsync(UserId, r, ct));
}
