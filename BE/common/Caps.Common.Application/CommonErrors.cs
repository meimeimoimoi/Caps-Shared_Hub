using Caps.Common.Domain;

namespace Caps.Common.Application;

/// <summary>Mã lỗi mà service nào cũng có thể gặp. Mã nghiệp vụ để trong service, không thêm vào đây.</summary>
public static class CommonErrors
{
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
        public const string Internal = "INTERNAL_ERROR";
    }

    /// <summary>Token hỏng, hết hiệu lực hoặc đã bị thu hồi.</summary>
    public static AppException InvalidSession(string message = "Invalid session.") =>
        new(ErrorType.Unauthorized, Codes.InvalidSession, message);

    /// <summary>Claim trong token đã cũ: FE cần refresh để nhận token mới.</summary>
    public static AppException RefreshRequired(string message = "Refresh the session.") =>
        new(ErrorType.Unauthorized, Codes.RefreshRequired, message);

    public static AppException AccountNotActive(
        string message = "Email verification and active account required."
    ) => new(ErrorType.Forbidden, Codes.AccountNotActive, message);

    /// <summary>Chống CSRF: request thay đổi dữ liệu từ SPA phải có header nhận diện.</summary>
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
}

/// <summary>Dữ liệu vào không hợp lệ; <see cref="Errors"/> gom lỗi theo từng trường.</summary>
public sealed class ValidationException(
    string message,
    IDictionary<string, string[]>? errors = null,
    string code = CommonErrors.Codes.ValidationFailed
) : AppException(ErrorType.Validation, code, message)
{
    public IDictionary<string, string[]>? Errors { get; } = errors;
}
