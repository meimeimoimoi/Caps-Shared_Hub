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

    [HttpGet]
    public async Task<IActionResult> Me(
        [FromServices] IQueryHandler<GetMeQuery, MeResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId), ct)));

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

    [HttpDelete("avatar"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> RemoveAvatar(
        [FromServices] ICommandHandler<RemoveAvatarCommand, MeResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId), ct)));
}
