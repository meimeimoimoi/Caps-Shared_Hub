namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>The time range to open, with offset (e.g. 2026-10-20T09:00:00+07:00).</summary>
public sealed record OpenSlotRequest(DateTimeOffset StartAt, DateTimeOffset EndAt);
