namespace Caps.Common.Domain;

/// <summary>Vi phạm quy tắc nghiệp vụ; GlobalExceptionHandler trả 422.</summary>
public class DomainException(string message) : Exception(message);
