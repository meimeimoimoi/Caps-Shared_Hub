using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Profile;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

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
