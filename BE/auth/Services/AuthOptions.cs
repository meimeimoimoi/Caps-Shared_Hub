using Caps.Common.Domain;

namespace auth.Services;

public sealed class AuthOptions
{
    public int AccessMinutes { get; set; } = 15;
    public int RefreshDays { get; set; } = 7;
    public int VerificationMinutes { get; set; } = 1440;

    /// <summary>Mã 6 số trong email xác nhận: hạn ngắn và giới hạn số lần nhập sai vì dễ đoán hơn link.</summary>
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
/// Cầu nối tạm: lỗi của auth đi qua cơ chế lỗi chung (GlobalExceptionHandler).
/// Bước tái cấu trúc auth sẽ thay bằng CommonErrors / AuthErrors theo ErrorType.
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
