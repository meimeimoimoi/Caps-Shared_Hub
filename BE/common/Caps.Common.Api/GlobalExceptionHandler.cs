using Caps.Common.Application;
using Caps.Common.Domain;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Caps.Common.Api;

/// <summary>Centralized ProblemDetails mapping. Register via AddExceptionHandler.</summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        var traceId = httpContext.TraceIdentifier;
        logger.LogError(exception, "Unhandled exception. TraceId={TraceId}", traceId);

        var (status, title) = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            NotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            DomainException => (StatusCodes.Status422UnprocessableEntity, "Domain rule violated"),
            _ => (StatusCodes.Status500InternalServerError, "Internal server error"),
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = status >= 500 ? "An unexpected error occurred." : exception.Message,
            Instance = httpContext.Request.Path,
        };
        problem.Extensions["traceId"] = traceId;

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(
            ApiResponse<ProblemDetails>.Fail(
                status >= 500 ? "An unexpected error occurred." : exception.Message
            ),
            cancellationToken
        );

        return true;
    }
}
