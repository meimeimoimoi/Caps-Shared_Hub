using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Profile;
using Caps.Auth.Domain.Users;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>The signed-in user's own profile and avatar.</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/users/me")]
public sealed class ProfileController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    private const int UploadLimit = UserAvatar.MaxBytes + 64 * 1024;

    /// <summary>Returns the signed-in user's profile (roles, permissions, avatar URL).</summary>
    /// <response code="200">Profile of the current user.</response>
    /// <response code="401">INVALID_SESSION (revoked token) or REFRESH_REQUIRED (account status changed; refresh, then retry).</response>
    [HttpGet]
    public async Task<IActionResult> Me(
        [FromServices] IQueryHandler<GetMeQuery, MeResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId), ct)));

    /// <summary>Updates the display name and phone number.</summary>
    /// <response code="200">Updated profile.</response>
    /// <response code="400">Invalid input.</response>
    /// <response code="403">The account is not active yet (email not verified).</response>
    [HttpPut, Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> Update(
        UpdateProfileRequest r,
        [FromServices] ICommandHandler<UpdateProfileCommand, MeResponse> handler,
        CancellationToken ct
    ) =>
        Ok(
            ApiResponse<MeResponse>.Ok(
                await handler.HandleAsync(new(UserId, r.DisplayName, r.Phone), ct)
            )
        );

    /// <summary>Uploads or replaces the avatar (multipart field <c>file</c>).</summary>
    /// <remarks>JPEG, PNG or WebP up to 2 MB; the format is detected from the file bytes, not from its name.</remarks>
    /// <response code="200">Updated profile with the new versioned avatar URL.</response>
    /// <response code="400">AVATAR_REQUIRED, AVATAR_TOO_LARGE or AVATAR_INVALID_TYPE.</response>
    /// <response code="403">The account is not active yet.</response>
    [HttpPut("avatar"), Authorize(Policy = "ActiveAccount")]
    [RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> UploadAvatar(
        IFormFile? file,
        [FromServices] ICommandHandler<UpdateAvatarCommand, MeResponse> handler,
        CancellationToken ct
    )
    {
        // Size and format are validated by the domain from the bytes themselves
        using var buffer = new MemoryStream();
        if (file != null)
            await file.CopyToAsync(buffer, ct);
        var command = new UpdateAvatarCommand(UserId, buffer.ToArray());
        return Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(command, ct)));
    }

    /// <summary>Removes the avatar.</summary>
    /// <response code="200">Updated profile without an avatar URL.</response>
    /// <response code="403">The account is not active yet.</response>
    [HttpDelete("avatar"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> RemoveAvatar(
        [FromServices] ICommandHandler<RemoveAvatarCommand, MeResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId), ct)));
}
