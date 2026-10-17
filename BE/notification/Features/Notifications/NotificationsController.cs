using System.Text.Json;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Notification.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.Notifications;

/// <summary>In-app notifications of the signed-in account (header bell).</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/notifications/me")]
public sealed class NotificationsController(
    ICurrentUser currentUser,
    NotificationDbContext db,
    TimeProvider clock
) : ControllerBase
{
    private const int PageSize = 20;

    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists the newest notifications.</summary>
    /// <remarks>Returns at most 20 items, newest first, and the total number of unread ones.</remarks>
    /// <response code="200">The notifications.</response>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var mine = db.Notifications.AsNoTracking().Where(x => x.UserId == UserId);
        var rows = await mine.OrderByDescending(x => x.CreatedAt).Take(PageSize).ToListAsync(ct);
        var unread = await mine.CountAsync(x => x.ReadAt == null, ct);
        var items = rows.ConvertAll(x => new NotificationResponse(
            x.Id,
            x.Type,
            JsonDocument.Parse(x.Data).RootElement.Clone(),
            x.CreatedAt,
            x.ReadAt
        ));
        return Ok(ApiResponse<NotificationListResponse>.Ok(new(items, unread)));
    }

    /// <summary>Marks one notification as read.</summary>
    /// <remarks>Reading an already read notification keeps its first read time.</remarks>
    /// <response code="200">Marked as read.</response>
    /// <response code="404">No such notification for this account.</response>
    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var notification =
            await db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId, ct)
            ?? throw CommonErrors.NotFound("Notification not found.");
        notification.MarkRead(clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse.Message("Marked as read."));
    }

    /// <summary>Marks every notification of the account as read.</summary>
    /// <response code="200">All marked as read.</response>
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        await db
            .Notifications.Where(x => x.UserId == UserId && x.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReadAt, now), ct);
        return Ok(ApiResponse.Message("All marked as read."));
    }
}
