using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Profiles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's own contact details, edited from the settings page.</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/profile")]
public sealed class ProfileController(ICurrentUser currentUser) : ControllerBase
{
    private Applicant Applicant => Applicant.From(currentUser);

    /// <summary>Updates the professional name and contact phone.</summary>
    /// <remarks>
    /// Allowed at any stage once a profile exists; no new review is needed. Submitted applications keep the
    /// details they were reviewed with.
    /// </remarks>
    /// <response code="200">The saved name and phone.</response>
    /// <response code="400">Invalid input or CONTACT_REQUIRED (blank name or phone).</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">EXPERT_NOT_FOUND: no draft has been saved yet.</response>
    [HttpPut]
    public async Task<IActionResult> Update(
        UpdateExpertProfileRequest r,
        [FromServices] ICommandHandler<UpdateMyProfileCommand, ExpertContactResponse> handler,
        CancellationToken ct
    )
    {
        var contact = await handler.HandleAsync(r.ToCommand(Applicant), ct);
        return Ok(ApiResponse<ExpertContactResponse>.Ok(contact));
    }
}
