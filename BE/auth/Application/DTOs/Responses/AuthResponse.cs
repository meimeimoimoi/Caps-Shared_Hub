namespace Caps.Auth.Application.DTOs.Responses;

/// <summary>What sign-in, sign-up and refresh return: the access token and the user it belongs to.</summary>
/// <param name="IsNewAccount">True only on the response that created the account (sign-up or a first Google sign-in).</param>
public sealed record AuthResponse(
    string AccessToken,
    int ExpiresIn,
    MeResponse User,
    bool IsNewAccount = false
);

/// <summary>The signed-in user as the FE shows it; roles and permissions match the access token.</summary>
public sealed record MeResponse(
    string UserId,
    string Email,
    string DisplayName,
    string? Phone,
    string Status,
    bool EmailVerified,
    string[] Roles,
    string[] Permissions,
    string? AvatarUrl = null
);

/// <summary>Avatar bytes and type, served from GET /users/{id}/avatar.</summary>
public sealed record AvatarFile(string ContentType, byte[] Data, DateTimeOffset UpdatedAt);

/// <summary>A new session: the response body plus the refresh token the API puts in an HttpOnly cookie.</summary>
public sealed record SessionResult(
    AuthResponse Response,
    string RefreshToken,
    DateTimeOffset RefreshExpiresAt
);

/// <summary>Company details of a customer account.</summary>
public sealed record BusinessResponse(
    string CompanyName,
    string TaxCode,
    string? Address,
    string? Representative,
    string? ContactEmail,
    string? ContactPhone
);
