namespace Caps.Common.Application;

/// <summary>The signed-in user as the access token describes it.</summary>
public interface ICurrentUser
{
    string? UserId { get; }
    string? Email { get; }

    /// <summary>Account status claim of the token (ACTIVE once the email is verified).</summary>
    string? AccountStatus { get; }

    /// <summary>The access token's id (jti), used to revoke this one token on sign-out.</summary>
    string? TokenId { get; }

    /// <summary>When the access token expires (exp).</summary>
    DateTimeOffset? TokenExpiresAt { get; }
    bool IsAuthenticated { get; }
}
