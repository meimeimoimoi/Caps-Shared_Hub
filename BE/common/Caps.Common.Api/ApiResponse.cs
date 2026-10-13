using System.Text.Json.Serialization;

namespace Caps.Common.Api;

/// <summary>Successful response shape of every service: { success, data, message }.</summary>
public sealed record ApiResponse<T>(bool Success, T? Data, string? Message = null)
{
    public static ApiResponse<T> Ok(T data, string? message = null) => new(true, data, message);

    public static ApiResponse<T> Fail(string message) => new(false, default, message);
}

/// <summary>Shortcuts for responses without a payload.</summary>
public static class ApiResponse
{
    /// <summary>Successful action that only reports a message (data is an empty object).</summary>
    public static ApiResponse<object> Message(string message) => new(true, new { }, message);
}

/// <summary>Uniform error shape for every service: the FE relies on <see cref="Code"/>, not on the message.</summary>
public sealed record ApiErrorResponse(
    string Message,
    string Code,
    string? TraceId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        IDictionary<string, string[]>? Errors = null
)
{
    // Always false / null; serialized so errors keep the same shape as ApiResponse<T>
    public bool Success { get; }
    public object? Data { get; }
}

/// <summary>Response shape for a page of items. Not used by any endpoint yet.</summary>
public sealed record PagedResponse<T>(
    bool Success,
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long Total,
    string? Message = null
);
