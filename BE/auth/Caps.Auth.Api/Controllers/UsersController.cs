using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Profile;
using Caps.Auth.Domain.Users;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/users/me")]
public sealed class UsersController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

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
    [RequestSizeLimit(UserAvatar.MaxBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = UserAvatar.MaxBytes + 64 * 1024)]
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
        return Ok(
            ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId, buffer.ToArray()), ct))
        );
    }

    [HttpDelete("avatar"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> RemoveAvatar(
        [FromServices] ICommandHandler<RemoveAvatarCommand, MeResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId), ct)));

    [HttpGet("business-profile"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> Business(
        [FromServices] IQueryHandler<GetBusinessProfileQuery, BusinessResponse?> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<BusinessResponse?>.Ok(await handler.HandleAsync(new(UserId), ct)));

    [HttpPut("business-profile"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> BusinessUpdate(
        BusinessProfileRequest r,
        [FromServices] ICommandHandler<UpdateBusinessProfileCommand, BusinessResponse> handler,
        CancellationToken ct
    ) =>
        Ok(
            ApiResponse<BusinessResponse>.Ok(
                await handler.HandleAsync(
                    new(
                        UserId,
                        r.CompanyName,
                        r.TaxCode,
                        r.Address,
                        r.Representative,
                        r.ContactEmail,
                        r.ContactPhone
                    ),
                    ct
                )
            )
        );
}

/// <summary>
/// Public avatar: an img tag cannot send a bearer token, so this endpoint does not require sign-in.
/// </summary>
[ApiController, AllowAnonymous, Route("api/v1/users/{id:guid}/avatar")]
public sealed class AvatarsController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices] IQueryHandler<GetAvatarQuery, AvatarFile?> handler,
        CancellationToken ct
    )
    {
        var avatar = await handler.HandleAsync(new(id), ct);
        if (avatar == null)
            return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        // The URL carries ?v=<updated time>, so each image version can be cached long-term.
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(avatar.Data, avatar.ContentType);
    }
}
