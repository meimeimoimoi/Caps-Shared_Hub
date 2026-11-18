using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Common.Security;
using Caps.Notification.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.AuditLogs;

/// <summary>The audit trail of staff actions across services, for the System Admin.</summary>
[ApiController, Route("api/v1/admin/audit-logs")]
[RequirePermission(Permission.UserManage)]
public sealed class AuditLogsController(NotificationDbContext db) : ControllerBase
{
    /// <summary>Lists audit entries, newest first.</summary>
    /// <remarks>
    /// Every filter is optional and they combine. entityType and entityId find the history of one record (for
    /// example USER and the account id); actorUserId finds what one staff member did; action and service match
    /// exactly, ignoring case. from and to bound the time (from inclusive, to exclusive). page starts at 1;
    /// pageSize defaults to 20 and is at most 100.
    /// </remarks>
    /// <response code="200">The page with the total number of matching entries.</response>
    /// <response code="400">A filter is out of range, or from is not before to.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        CancellationToken ct,
        [FromQuery, MaxLength(64)] string? entityType = null,
        [FromQuery] Guid? entityId = null,
        [FromQuery] Guid? actorUserId = null,
        [FromQuery, MaxLength(64)] string? action = null,
        [FromQuery, MaxLength(32)] string? service = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20
    )
    {
        if (from >= to)
        {
            throw new AppException(
                ErrorType.Validation,
                CommonErrors.Codes.ValidationFailed,
                "from must be before to."
            );
        }

        var query = db.AuditLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(entityType))
        {
            var type = entityType.Trim().ToUpperInvariant();
            query = query.Where(x => x.EntityType == type);
        }
        if (entityId is Guid id)
            query = query.Where(x => x.EntityId == id);
        if (actorUserId is Guid actor)
            query = query.Where(x => x.ActorUserId == actor);
        if (!string.IsNullOrWhiteSpace(action))
        {
            var name = action.Trim().ToUpperInvariant();
            query = query.Where(x => x.Action == name);
        }
        if (!string.IsNullOrWhiteSpace(service))
        {
            var source = service.Trim().ToLowerInvariant();
            query = query.Where(x => x.Service == source);
        }
        if (from is DateTimeOffset start)
            query = query.Where(x => x.CreatedAt >= start);
        if (to is DateTimeOffset end)
            query = query.Where(x => x.CreatedAt < end);

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        var items = rows.Select(x => new AuditLogResponse(
                x.Id,
                x.Service,
                x.EntityType,
                x.EntityId,
                x.Action,
                x.ActorUserId,
                x.Detail == null ? null : JsonDocument.Parse(x.Detail).RootElement.Clone(),
                x.CreatedAt
            ))
            .ToArray();
        var result = new AuditLogPageResponse(items, page, pageSize, total);
        return Ok(ApiResponse<AuditLogPageResponse>.Ok(result));
    }
}
