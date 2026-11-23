using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.CaseChat;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>Read-only access to any review case's chat for administrators handling a dispute.</summary>
[ApiController, RequirePermission(Permission.UserManage)]
[Route("api/v1/admin/review-cases")]
public sealed class AdminReviewCaseMessagesController : ControllerBase
{
    /// <summary>Returns a page of the case's messages, oldest first.</summary>
    /// <remarks>Same cursors as the parties' endpoint: <c>before</c>, <c>after</c> and <c>limit</c>.</remarks>
    /// <response code="200">The messages (may be empty).</response>
    /// <response code="403">Missing the UserManage permission.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or MESSAGE_NOT_FOUND (cursor).</response>
    [HttpGet("{caseId:guid}/messages")]
    public async Task<IActionResult> List(
        Guid caseId,
        [FromQuery] Guid? before,
        [FromQuery] Guid? after,
        [FromQuery] int? limit,
        [FromServices] IQueryHandler<ListCaseMessagesForAdminQuery, CaseMessageResponse[]> handler,
        CancellationToken ct
    )
    {
        var page = await handler.HandleAsync(new(caseId, before, after, limit), ct);
        return Ok(ApiResponse<CaseMessageResponse[]>.Ok(page));
    }
}
