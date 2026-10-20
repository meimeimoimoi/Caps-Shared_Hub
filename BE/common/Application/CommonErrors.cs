using Caps.Common.Domain;

namespace Caps.Common.Application;

/// <summary>Error codes any service may raise. Business codes belong in their service, not here.</summary>
public static class CommonErrors
{
    /// <summary>The error codes as constants, for code that compares or documents them.</summary>
    public static class Codes
    {
        public const string ValidationFailed = "VALIDATION_FAILED";
        public const string NotFound = "NOT_FOUND";
        public const string Forbidden = "FORBIDDEN";
        public const string InvalidSession = "INVALID_SESSION";
        public const string RefreshRequired = "REFRESH_REQUIRED";
        public const string AccountNotActive = "ACCOUNT_NOT_ACTIVE";
        public const string ClientHeaderRequired = "CLIENT_HEADER_REQUIRED";
        public const string OriginRejected = "ORIGIN_REJECTED";
        public const string TooManyRequests = "RATE_LIMITED";
        public const string SessionCheckUnavailable = "SESSION_CHECK_UNAVAILABLE";
        public const string Internal = "INTERNAL_ERROR";
    }

    /// <summary>Token is malformed, expired or revoked.</summary>
    public static AppException InvalidSession(string message = "Invalid session.") =>
        new(ErrorType.Unauthorized, Codes.InvalidSession, message);

    /// <summary>Token claims are stale: the FE must refresh to get a new token.</summary>
    public static AppException RefreshRequired(string message = "Refresh the session.") =>
        new(ErrorType.Unauthorized, Codes.RefreshRequired, message);

    public static AppException AccountNotActive(
        string message = "Email verification and active account required."
    ) => new(ErrorType.Forbidden, Codes.AccountNotActive, message);

    /// <summary>CSRF guard: state-changing requests from the SPA must carry the client header.</summary>
    public static AppException ClientHeaderRequired(
        string message = "X-Caps-Client: spa is required."
    ) => new(ErrorType.Forbidden, Codes.ClientHeaderRequired, message);

    public static AppException OriginRejected(string message = "Origin is not allowed.") =>
        new(ErrorType.Forbidden, Codes.OriginRejected, message);

    public static AppException Forbidden(string message = "Permission denied.") =>
        new(ErrorType.Forbidden, Codes.Forbidden, message);

    public static AppException NotFound(string message = "Resource not found.") =>
        new(ErrorType.NotFound, Codes.NotFound, message);

    public static AppException TooManyRequests(string message = "Too many requests.") =>
        new(ErrorType.TooManyRequests, Codes.TooManyRequests, message);

    /// <summary>A sensitive endpoint cannot confirm the session was not revoked (revocation store down).</summary>
    public static AppException SessionCheckUnavailable(
        string message = "Session check is temporarily unavailable. Try again shortly."
    ) => new(ErrorType.Unavailable, Codes.SessionCheckUnavailable, message);
}

/// <summary>Invalid input; <see cref="Errors"/> groups messages per field.</summary>
public sealed class ValidationException(
    string message,
    IDictionary<string, string[]>? errors = null,
    string code = CommonErrors.Codes.ValidationFailed
) : AppException(ErrorType.Validation, code, message)
{
    public IDictionary<string, string[]>? Errors { get; } = errors;
}
