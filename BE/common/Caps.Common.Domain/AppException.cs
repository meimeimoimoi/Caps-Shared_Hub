namespace Caps.Common.Domain;

/// <summary>Error category in business terms; only the Api layer maps it to an HTTP status.</summary>
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
/// An intentional error with a stable code (`code` in the response) for the FE to handle.
/// Shared codes live in <c>CommonErrors</c>; business codes are declared in each service.
/// </summary>
public class AppException(ErrorType type, string code, string message) : Exception(message)
{
    public ErrorType Type { get; } = type;
    public string Code { get; } = code;
}
