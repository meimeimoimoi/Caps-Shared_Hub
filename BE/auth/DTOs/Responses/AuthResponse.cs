namespace auth.DTOs.Responses;
public sealed record AuthResponse(string AccessToken, int ExpiresIn, MeResponse User);
public sealed record MeResponse(string UserId, string Email, string DisplayName, string? Phone, string Status, bool EmailVerified, string[] Roles, string[] Permissions);
public sealed record SessionResult(AuthResponse Response, string RefreshToken, DateTimeOffset RefreshExpiresAt);
public sealed record BusinessResponse(string CompanyName, string TaxCode, string? Address, string? Representative, string? ContactEmail, string? ContactPhone);
