namespace auth.DTOs.Responses;

public sealed record AuthResponse(string AccessToken, string UserId, string Email, string DisplayName);
public sealed record MeResponse(string UserId, string? Email);
