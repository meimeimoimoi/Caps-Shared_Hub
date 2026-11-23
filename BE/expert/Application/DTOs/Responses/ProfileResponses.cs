namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>The expert's professional name and contact phone after an update from the settings page.</summary>
public sealed record ExpertContactResponse(string DisplayName, string? Phone);
