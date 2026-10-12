using System.Text.Json.Serialization;

namespace Caps.Common.Api;

public sealed record ApiResponse<T>(bool Success, T? Data, string? Message = null)
{
    public static ApiResponse<T> Ok(T data, string? message = null) => new(true, data, message);

    public static ApiResponse<T> Fail(string message) => new(false, default, message);
}

/// <summary>Dạng lỗi thống nhất cho mọi service: FE dựa vào <see cref="Code"/>, không dựa vào message.</summary>
public sealed record ApiErrorResponse(
    string Message,
    string Code,
    string? TraceId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        IDictionary<string, string[]>? Errors = null
)
{
    public bool Success => false;
    public object? Data => null;
}

public sealed record PagedResponse<T>(
    bool Success,
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long Total,
    string? Message = null
);
