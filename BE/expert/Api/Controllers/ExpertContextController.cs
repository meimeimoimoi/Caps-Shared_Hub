using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Portal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// The Expert Portal context of the signed-in account. Any signed-in account may enter the portal to apply;
/// the capabilities decide which areas open (application → service setup → cases).
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/context")]
public sealed class ExpertContextController(ICurrentUser currentUser) : ControllerBase
{
    // Same claim name auth writes in access tokens: "permission", singular
    private const string PermissionClaim = "permission";

    /// <summary>Returns the portal stage, capabilities and readiness of each active service.</summary>
    /// <remarks>
    /// Capabilities: application.view (always), services.manage and profile.public (a service approved),
    /// cases.work and income.view (a service can take bookings). The EXPERT role's permissions grant them too.
    /// </remarks>
    /// <response code="200">The context.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetMyContextQuery, ExpertContextResponse> handler,
        CancellationToken ct
    )
    {
        var query = new GetMyContextQuery(
            Applicant.From(currentUser),
            currentUser.AccountStatus ?? "",
            HasPermission(Permission.ServiceManage),
            HasPermission(Permission.CaseWork)
        );
        var context = await handler.HandleAsync(query, ct);
        return Ok(ApiResponse<ExpertContextResponse>.Ok(context));
    }

    private bool HasPermission(Permission permission) =>
        User.HasClaim(PermissionClaim, permission.ToString());
}
