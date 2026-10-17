namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One availability slot of the signed-in expert.</summary>
public sealed record SlotResponse(
    Guid id,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string Status
);
