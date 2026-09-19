using auth.DTOs.Requests;
using auth.DTOs.Responses;
using auth.Services.Interface;
using Caps.Common.Abstractions;
using Caps.Common.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace auth.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await auth.RegisterAsync(request, ct);
        return Ok(ApiResponse<AuthResponse>.Ok(result, "Registered."));
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await auth.LoginAsync(request, ct);
        return Ok(ApiResponse<AuthResponse>.Ok(result, "Logged in."));
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<ApiResponse<MeResponse>> Me([FromServices] ICurrentUser me)
    {
        return Ok(ApiResponse<MeResponse>.Ok(new MeResponse(me.UserId!, me.Email), "Ok."));
    }
}
