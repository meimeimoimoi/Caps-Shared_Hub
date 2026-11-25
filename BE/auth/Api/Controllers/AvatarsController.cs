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
    /// <summary>Returns a user's avatar image (no sign-in needed, so img tags can load it).</summary>
    /// <remarks>
    /// Use the versioned URL from the profile; each version is cached for a year. Without ?v (public expert
    /// profiles) the image is cached for 5 minutes.
    /// </remarks>
    /// <response code="200">The image bytes.</response>
    /// <response code="404">The user has no avatar.</response>
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
        Response.Headers.XContentTypeOptions = "nosniff";
        // A ?v=<updated time> URL never changes, so it is cached long-term; the bare URL (public expert
        // profiles, which do not know the version) is cached briefly so a new avatar shows up soon.
        Response.Headers.CacheControl = Request.Query.ContainsKey("v")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=300";
        return File(avatar.Data, avatar.ContentType);
    }
}
