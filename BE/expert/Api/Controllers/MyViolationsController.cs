using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Violations;
using Caps.Expert.Domain.Applications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's violation points and excuse requests.</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/violations")]
public sealed class MyViolationsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists the expert's own violations, newest first, with the points that count now.</summary>
    /// <response code="200">The points and the violations (empty before the expert has a profile).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListMyViolationsQuery, ExpertViolationsResponse> handler,
        CancellationToken ct
    )
    {
        var violations = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<ExpertViolationsResponse>.Ok(violations));
    }

    // Up to 5 files of 10 MB plus the form fields
    private const long UploadLimit = (5 * ApplicationRules.MaxFileBytes) + (64 * 1024);

    /// <summary>Asks the admin to excuse one violation for force majeure, with evidence files.</summary>
    /// <remarks>
    /// multipart/form-data: reason (required) and up to 5 files (PDF, JPEG or PNG, 10 MB each). Once per
    /// violation, within 2 days of it. The operations inbox is emailed.
    /// </remarks>
    /// <response code="200">The violations after the request.</response>
    /// <response code="400">VIOLATION_EXCUSE_REASON_REQUIRED, VIOLATION_EXCUSE_FILE_LIMIT, EVIDENCE_TOO_LARGE or EVIDENCE_INVALID_TYPE.</response>
    /// <response code="404">VIOLATION_NOT_FOUND.</response>
    /// <response code="409">VIOLATION_ALREADY_EXCUSED, VIOLATION_EXCUSE_ALREADY_REQUESTED or VIOLATION_EXCUSE_REQUEST_CLOSED.</response>
    [HttpPost("{reviewCaseId:guid}/excuse-request")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> RequestExcuse(
        Guid reviewCaseId,
        [FromForm] string? reason,
        [FromForm] List<IFormFile>? files,
        [FromServices] ICommandHandler<RequestExcuseCommand> request,
        [FromServices] IQueryHandler<ListMyViolationsQuery, ExpertViolationsResponse> list,
        CancellationToken ct
    )
    {
        var uploads = new List<(string FileName, byte[] Content)>();
        foreach (var file in files ?? [])
        {
            await using var buffer = new MemoryStream();
            await file.CopyToAsync(buffer, ct);
            uploads.Add((file.FileName, buffer.ToArray()));
        }
        await request.HandleAsync(new(UserId, reviewCaseId, reason, uploads), ct);
        var violations = await list.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<ExpertViolationsResponse>.Ok(violations));
    }
}
