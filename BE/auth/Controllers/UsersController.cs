using System.Security.Claims;
using auth.DTOs.Requests;
using auth.DTOs.Responses;
using auth.Services;
using auth.Services.Interface;
using Caps.Common.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace auth.Controllers;

[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/users/me")]
public sealed class UsersController(IAuthService auth) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("sub")!);

    [HttpGet]
    public async Task<IActionResult> Me(CancellationToken ct) =>
        Ok(ApiResponse<MeResponse>.Ok(await auth.MeAsync(UserId, ct)));

    [HttpPut, Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> Update(UpdateProfileRequest r, CancellationToken ct) =>
        Ok(ApiResponse<MeResponse>.Ok(await auth.UpdateAsync(UserId, r, ct)));

    public const int MaxAvatarBytes = 2 * 1024 * 1024;

    [HttpPut("avatar"), Authorize(Policy = "ActiveAccount")]
    [RequestSizeLimit(MaxAvatarBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxAvatarBytes + 64 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            throw new AuthFailure(400, "AVATAR_REQUIRED", "Avatar file is required.");
        if (file.Length > MaxAvatarBytes)
            throw new AuthFailure(400, "AVATAR_TOO_LARGE", "Avatar must be 2 MB or smaller.");
        using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, ct);
        var data = buffer.ToArray();
        // Xác định định dạng theo nội dung file, không tin Content-Type do client gửi.
        var type =
            ImageType(data)
            ?? throw new AuthFailure(
                400,
                "AVATAR_INVALID_TYPE",
                "Only JPEG, PNG or WebP images are allowed."
            );
        return Ok(ApiResponse<MeResponse>.Ok(await auth.UpdateAvatarAsync(UserId, type, data, ct)));
    }

    [HttpDelete("avatar"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> RemoveAvatar(CancellationToken ct) =>
        Ok(ApiResponse<MeResponse>.Ok(await auth.RemoveAvatarAsync(UserId, ct)));

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
    public async Task<IActionResult> Business(CancellationToken ct) =>
        Ok(ApiResponse<BusinessResponse?>.Ok(await auth.BusinessAsync(UserId, ct)));

    [HttpPut("business-profile"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> BusinessUpdate(
        BusinessProfileRequest r,
        CancellationToken ct
    ) => Ok(ApiResponse<BusinessResponse>.Ok(await auth.UpdateBusinessAsync(UserId, r, ct)));
}

/// <summary>
/// Ảnh đại diện công khai: thẻ img không gửi được bearer token nên endpoint này không yêu cầu đăng nhập.
/// </summary>
[ApiController, AllowAnonymous, Route("api/v1/users/{id:guid}/avatar")]
public sealed class AvatarsController(IAuthService auth) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var avatar = await auth.AvatarAsync(id, ct);
        if (avatar == null)
            return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        // URL có ?v=<thời điểm cập nhật> nên mỗi phiên bản ảnh được cache lâu dài.
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(avatar.Data, avatar.ContentType);
    }
}
