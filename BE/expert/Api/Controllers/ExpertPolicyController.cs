using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Policies;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// Expert policy values a System Admin can change without a restart (BR-E29): EV-06 minimum years and the
/// reapply intervals after Gate 1 NOT_ELIGIBLE and Gate 2 FAIL. Configuration holds only the defaults.
/// </summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/policy")]
public sealed class ExpertPolicyController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the values in force with their defaults and allowed ranges.</summary>
    /// <response code="200">Every adjustable value.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetExpertPolicyQuery, ExpertPolicyResponse> handler,
        CancellationToken ct
    )
    {
        var policy = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<ExpertPolicyResponse>.Ok(policy));
    }

    /// <summary>Changes one or more values with a reason.</summary>
    /// <remarks>
    /// Applies to decisions made from now on; past decisions keep the values stored with them (for example the
    /// earliest reapply date). Minimum years: 0–50; days after NOT_ELIGIBLE: 30–365; days after Gate 2
    /// FAIL: 90–365. The reapply minimums come from BR-E21/BR-E22 and can only be raised (BR-E27).
    /// </remarks>
    /// <response code="200">The values in force after the change.</response>
    /// <response code="400">UNKNOWN_POLICY_SETTING, POLICY_SETTING_OUT_OF_RANGE, POLICY_EXPECTED_VALUE_REQUIRED, POLICY_REASON_REQUIRED or POLICY_REASON_TOO_LONG.</response>
    /// <response code="409">POLICY_CHANGED: someone else changed a value since it was read; reload and try again.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPut, RequireSessionCheck]
    public async Task<IActionResult> Update(
        UpdateExpertPolicyRequest r,
        [FromServices] ICommandHandler<UpdateExpertPolicyCommand, ExpertPolicyResponse> handler,
        CancellationToken ct
    )
    {
        var policy = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<ExpertPolicyResponse>.Ok(policy));
    }

    /// <summary>Lists the most recent changes (at most 100), newest first.</summary>
    /// <response code="200">The history (may be empty).</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet("history")]
    public async Task<IActionResult> History(
        [FromServices]
            IQueryHandler<
            ListExpertPolicyHistoryQuery,
            IReadOnlyList<PolicySettingChangeResponse>
        > handler,
        CancellationToken ct
    )
    {
        var history = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<IReadOnlyList<PolicySettingChangeResponse>>.Ok(history));
    }
}
