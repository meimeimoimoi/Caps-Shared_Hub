using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace Caps.Common.Security;

/// <summary>Requires a permission in the access token (403 otherwise); tokens only carry permissions once ACTIVE.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute(Permission permission)
    : AuthorizeAttribute,
        IAuthorizationRequirementData
{
    // Same claim name auth writes in JwtAccessTokenIssuer: "permission", singular
    public IEnumerable<IAuthorizationRequirement> GetRequirements() =>
        [new ClaimsAuthorizationRequirement("permission", [permission.ToString()])];
}
