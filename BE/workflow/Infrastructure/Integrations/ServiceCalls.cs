using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Caps.Common.Domain;
using Caps.Workflow.Domain;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Integrations;

/// <summary>
/// Sends a call to another service's /internal endpoints and turns the reply into workflow errors: business
/// errors (400, 404, 409, 422) pass through with their code; a broken link (401 wrong key, 5xx, timeout,
/// network) becomes 503, so a service-to-service 401 never signs the client out.
/// </summary>
internal static class ServiceCalls
{
    public const string KeyHeader = "X-Internal-Key";

    public static async Task<HttpResponseMessage> SendAsync(
        HttpClient http,
        HttpRequestMessage request,
        string service,
        ILogger logger,
        CancellationToken ct
    )
    {
        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, ct);
        }
        catch (Exception e)
            when (e is HttpRequestException
                || (e is TaskCanceledException && !ct.IsCancellationRequested)
            )
        {
            logger.LogWarning(e, "Call to {Service} failed", service);
            throw WorkflowErrors.ServiceLinkUnavailable(service);
        }
        if (response.IsSuccessStatusCode)
        {
            return response;
        }

        using (response)
        {
            ErrorType? type = response.StatusCode switch
            {
                HttpStatusCode.BadRequest => ErrorType.Validation,
                HttpStatusCode.NotFound => ErrorType.NotFound,
                HttpStatusCode.Conflict => ErrorType.Conflict,
                HttpStatusCode.UnprocessableEntity => ErrorType.RuleViolation,
                _ => null,
            };
            var error = type == null ? null : await ReadErrorAsync(response, ct);
            if (type == null || error == null)
            {
                logger.LogWarning(
                    "Call to {Service} answered {Status}",
                    service,
                    (int)response.StatusCode
                );
                throw WorkflowErrors.ServiceLinkUnavailable(service);
            }
            throw new AppException(type.Value, error.Code, error.Message);
        }
    }

    private sealed record Error(string Code, string Message);

    private static async Task<Error?> ReadErrorAsync(
        HttpResponseMessage response,
        CancellationToken ct
    )
    {
        try
        {
            var error = await response.Content.ReadFromJsonAsync<Error>(ct);
            return string.IsNullOrEmpty(error?.Code) ? null : error;
        }
        catch (Exception e) when (e is JsonException or NotSupportedException)
        {
            return null;
        }
    }
}
