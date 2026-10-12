namespace Caps.Common.Domain;

/// <summary>Loại lỗi theo nghĩa nghiệp vụ; chỉ tầng Api mới đổi sang mã HTTP.</summary>
public enum ErrorType
{
    Validation,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict,
    RuleViolation,
    TooManyRequests,
}

/// <summary>
/// Lỗi có chủ đích, kèm mã ổn định (`code` trong response) để FE xử lý.
/// Mã dùng chung ở <c>CommonErrors</c>; mã nghiệp vụ khai báo trong từng service.
/// </summary>
public class AppException(ErrorType type, string code, string message) : Exception(message)
{
    public ErrorType Type { get; } = type;
    public string Code { get; } = code;
}
