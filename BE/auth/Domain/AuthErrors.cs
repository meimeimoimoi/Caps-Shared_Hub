using Caps.Common.Domain;

namespace Caps.Auth.Domain;

/// <summary>
/// Business error codes of the identity service. The codes are part of the API contract the FE relies on;
/// codes shared by every service live in CommonErrors.
/// </summary>
public static class AuthErrors
{
    /// <summary>One generic error for every credential/token failure, so nothing leaks to attackers.</summary>
    public static AppException InvalidCredentials() =>
        new(ErrorType.Unauthorized, "INVALID_CREDENTIALS", "Invalid credentials or token.");

    public static AppException EmailExists() =>
        new(ErrorType.Conflict, "EMAIL_EXISTS", "Email already registered.");

    public static AppException GoogleEmailUnverified() =>
        new(
            ErrorType.Validation,
            "GOOGLE_EMAIL_UNVERIFIED",
            "This Google account has no verified email."
        );

    public static AppException GoogleLoginUnavailable() =>
        new(ErrorType.Unavailable, "GOOGLE_LOGIN_UNAVAILABLE", "Google sign-in is not configured.");

    public static AppException EmailDisposable() =>
        new(
            ErrorType.Validation,
            "EMAIL_DISPOSABLE",
            "Temporary email addresses are not accepted. Use an email you check regularly."
        );

    public static AppException EmailDomainInvalid() =>
        new(
            ErrorType.Validation,
            "EMAIL_DOMAIN_INVALID",
            "This email domain cannot receive email. Check the address for typos."
        );

    public static AppException EmailCooldown() =>
        new(
            ErrorType.TooManyRequests,
            "EMAIL_COOLDOWN",
            "Please wait before requesting another email."
        );

    public static AppException AlreadyVerified() =>
        new(ErrorType.Conflict, "ALREADY_VERIFIED", "Account is not pending verification.");

    public static AppException CodeExpired() =>
        new(ErrorType.Validation, "CODE_EXPIRED", "The code has expired. Request a new email.");

    public static AppException CodeLocked() =>
        new(
            ErrorType.TooManyRequests,
            "CODE_LOCKED",
            "Too many incorrect codes. Request a new email."
        );

    public static AppException CodeInvalid(int attemptsLeft) =>
        new(ErrorType.Validation, "CODE_INVALID", $"Incorrect code. {attemptsLeft} attempts left.");

    public static AppException CurrentPasswordInvalid() =>
        new(ErrorType.Validation, "CURRENT_PASSWORD_INVALID", "Current password is incorrect.");

    public static AppException PasswordUnchanged() =>
        new(
            ErrorType.Validation,
            "PASSWORD_UNCHANGED",
            "New password must differ from the current password."
        );

    public static AppException UserRoleRequired() =>
        new(ErrorType.Forbidden, "USER_ROLE_REQUIRED", "USER role required.");

    public static AppException AvatarRequired() =>
        new(ErrorType.Validation, "AVATAR_REQUIRED", "Avatar file is required.");

    public static AppException AvatarTooLarge() =>
        new(ErrorType.Validation, "AVATAR_TOO_LARGE", "Avatar must be 2 MB or smaller.");

    public static AppException AvatarInvalidType() =>
        new(
            ErrorType.Validation,
            "AVATAR_INVALID_TYPE",
            "Only JPEG, PNG or WebP images are allowed."
        );

    public static AppException UserNotFound() =>
        new(ErrorType.NotFound, "USER_NOT_FOUND", "Account not found.");

    public static AppException UserAlreadySuspended() =>
        new(ErrorType.Conflict, "USER_ALREADY_SUSPENDED", "The account is already locked.");

    public static AppException UserNotSuspended() =>
        new(ErrorType.Conflict, "USER_NOT_SUSPENDED", "The account is not locked.");

    public static AppException CannotSuspendSelf() =>
        new(ErrorType.RuleViolation, "CANNOT_SUSPEND_SELF", "You cannot lock your own account.");

    public static AppException SuspendReasonRequired() =>
        new(ErrorType.Validation, "SUSPEND_REASON_REQUIRED", "A reason is required to lock an account.");

    /// <summary>A password reset email only goes to an account that can sign in.</summary>
    public static AppException UserCannotSignIn() =>
        new(ErrorType.Conflict, "USER_CANNOT_SIGN_IN", "The account is locked.");
}
