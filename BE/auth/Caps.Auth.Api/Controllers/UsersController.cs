using System.Security.Claims;
using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Profile;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/users/me")]
public sealed class UsersController : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("sub")!);

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

    public const int MaxAvatarBytes = 2 * 1024 * 1024;

    [HttpPut("avatar"), Authorize(Policy = "ActiveAccount")]
    [RequestSizeLimit(MaxAvatarBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxAvatarBytes + 64 * 1024)]
    public async Task<IActionResult> UploadAvatar(
        IFormFile? file,
        [FromServices] ICommandHandler<UpdateAvatarCommand, MeResponse> handler,
        CancellationToken ct
    )
    {
        if (file == null || file.Length == 0)
            throw new AuthFailure(400, "AVATAR_REQUIRED", "Avatar file is required.");
        if (file.Length > MaxAvatarBytes)
            throw new AuthFailure(400, "AVATAR_TOO_LARGE", "Avatar must be 2 MB or smaller.");
        using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, ct);
        var data = buffer.ToArray();
        // Detect the format from the file content; never trust the client's Content-Type.
        var type =
            ImageType(data)
            ?? throw new AuthFailure(
                400,
                "AVATAR_INVALID_TYPE",
                "Only JPEG, PNG or WebP images are allowed."
            );
        return Ok(
            ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId, type, data), ct))
        );
    }

    [HttpDelete("avatar"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> RemoveAvatar(
        [FromServices] ICommandHandler<RemoveAvatarCommand, MeResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<MeResponse>.Ok(await handler.HandleAsync(new(UserId), ct)));

    private static string? ImageType(ReadOnlySpan<byte> d)
    {
        if (d.Length >= 3 && d[0] == 0xFF && d[1] == 0xD8 && d[2] == 0xFF)
            return "image/jpeg";
        if (
            d.Length >= 8
            && d[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })
        )
            return "image/png";
        if (d.Length >= 12 && d[..4].SequenceEqual("RIFF"u8) && d[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";
        return null;
    }

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
