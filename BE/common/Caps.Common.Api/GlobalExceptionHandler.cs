using Caps.Common.Application;
using Caps.Common.Domain;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Caps.Common.Api;

/// <summary>
/// The only place that turns errors into HTTP responses. Registered by AddCommonApi.
/// <see cref="AppException"/> maps to its status + code; unexpected errors return 500 without details.
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is AppException app)
        {
            logger.LogInformation(
                "Request rejected: {Code} {Message}. TraceId={TraceId}",
                app.Code,
                app.Message,
                httpContext.TraceIdentifier
            );
            await ApiErrors.WriteAsync(httpContext, app, cancellationToken);
            return true;
        }

        logger.LogError(
            exception,
            "Unhandled exception. TraceId={TraceId}",
            httpContext.TraceIdentifier
        );
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(
            new ApiErrorResponse(
                "An unexpected error occurred.",
                CommonErrors.Codes.Internal,
                httpContext.TraceIdentifier
            ),
            cancellationToken
        );
        return true;
    }
}

public static class ApiErrors
{
    public static int StatusCodeOf(ErrorType type) =>
        type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.RuleViolation => StatusCodes.Status422UnprocessableEntity,
            ErrorType.TooManyRequests => StatusCodes.Status429TooManyRequests,
            _ => StatusCodes.Status400BadRequest,
        };

    /// <summary>Writes the shared error shape; also usable in middleware that runs before the exception handler.</summary>
    public static Task WriteAsync(
        HttpContext httpContext,
        AppException exception,
        CancellationToken cancellationToken = default
    )
    {
        httpContext.Response.StatusCode = StatusCodeOf(exception.Type);
        return httpContext.Response.WriteAsJsonAsync(
            new ApiErrorResponse(
                exception.Message,
                exception.Code,
                httpContext.TraceIdentifier,
                (exception as ValidationException)?.Errors
            ),
            cancellationToken
        );
    }
}
