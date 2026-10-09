using System.Security.Claims;
using auth.DTOs.Requests;
using auth.DTOs.Responses;
using auth.Services.Interface;
using Caps.Common.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace auth.Controllers;
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/users/me")]
public sealed class UsersController(IAuthService auth) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue("sub")!);
    [HttpGet] public async Task<IActionResult> Me(CancellationToken ct) => Ok(ApiResponse<MeResponse>.Ok(await auth.MeAsync(UserId, ct)));
    [HttpPut, Authorize(Policy = "ActiveAccount")] public async Task<IActionResult> Update(UpdateProfileRequest r, CancellationToken ct) => Ok(ApiResponse<MeResponse>.Ok(await auth.UpdateAsync(UserId, r, ct)));
    [HttpGet("business-profile"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> Business(CancellationToken ct) => Ok(ApiResponse<BusinessResponse?>.Ok(await auth.BusinessAsync(UserId, ct)));
    [HttpPut("business-profile"), Authorize(Policy = "ActiveAccount")]
    public async Task<IActionResult> BusinessUpdate(BusinessProfileRequest r, CancellationToken ct) => Ok(ApiResponse<BusinessResponse>.Ok(await auth.UpdateBusinessAsync(UserId, r, ct)));
}
