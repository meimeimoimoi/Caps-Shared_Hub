using System.Security.Cryptography;
using System.Text;
using Caps.Common.Application;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Common.Security;

/// <summary>
/// Guards the /internal endpoints other services call: the X-Internal-Key header must equal this service's
/// InternalApi:Key (401 INTERNAL_KEY_INVALID otherwise). An empty key rejects every call. The gateway never
/// routes /internal, and each service has its own key.
/// </summary>
// ponytail: ingestion keeps its own older copy; switch it to this one when its owner agrees
// ponytail: one static key per service; move to client-credentials JWTs on the existing JWKS when callers need their own scopes
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireInternalKeyAttribute : Attribute, IAuthorizationFilter
{
    public const string Header = "X-Internal-Key";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        var expected = http.RequestServices.GetRequiredService<IConfiguration>()["InternalApi:Key"];
        var sent = http.Request.Headers[Header].ToString();

        if (
            string.IsNullOrEmpty(expected)
            || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(sent),
                Encoding.UTF8.GetBytes(expected)
            )
        )
        {
            throw CommonErrors.InternalKeyInvalid();
        }
    }
}
