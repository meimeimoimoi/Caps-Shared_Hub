using Caps.Common.Domain;

namespace Caps.Auth.Application;

public sealed class AuthOptions
{
    public int AccessMinutes { get; set; } = 15;
    public int RefreshDays { get; set; } = 7;
    public int VerificationMinutes { get; set; } = 1440;

    /// <summary>6-digit code in the verification email: short expiry and limited attempts, since it is easier to guess than a link.</summary>
    public int VerificationCodeMinutes { get; set; } = 10;
    public int MaxCodeAttempts { get; set; } = 5;
    public int ResetMinutes { get; set; } = 30;
    public int EmailCooldownSeconds { get; set; } = 60;
    public int MaxFailedAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    public string FrontendUrl { get; set; } = "http://localhost:5173";
    public bool SecureCookie { get; set; } = true;
}

/// <summary>
/// Temporary bridge: auth errors go through the shared error pipeline (GlobalExceptionHandler).
/// The auth refactor replaces it with CommonErrors / AuthErrors based on ErrorType.
/// </summary>
public sealed class AuthFailure(int status, string code, string message)
    : AppException(TypeOf(status), code, message)
{
    private static ErrorType TypeOf(int status) =>
        status switch
        {
            401 => ErrorType.Unauthorized,
            403 => ErrorType.Forbidden,
            404 => ErrorType.NotFound,
            409 => ErrorType.Conflict,
            422 => ErrorType.RuleViolation,
            429 => ErrorType.TooManyRequests,
            _ => ErrorType.Validation,
        };
}
