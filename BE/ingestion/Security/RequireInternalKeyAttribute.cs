using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Caps.Ingestion.Security;

/// <summary>
/// Guards the endpoints the crawler worker calls: the X-Internal-Key header must equal InternalApi:Key
/// (401 INTERNAL_KEY_INVALID otherwise; an empty key rejects every call). The gateway does not route them.
/// </summary>
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
            throw IngestionErrors.InternalKeyInvalid();
        }
    }
}
