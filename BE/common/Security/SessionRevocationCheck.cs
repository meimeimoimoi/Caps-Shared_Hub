using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Common.Security;

/// <summary>
/// Runs right after a token's signature and lifetime are validated. A revoked token (sign-out, password
/// change/reset, stolen refresh token) is treated as no token at all: public endpoints still work (an old
/// device can refresh), protected ones answer 401. If the store is down the token is trusted (it is signed
/// and short-lived) and the request is flagged so <see cref="RequireSessionCheckAttribute"/> can refuse it.
/// </summary>
public static class SessionRevocationCheck
{
    internal const string UncheckedItem = "caps:session-unchecked";

    public static async Task OnTokenValidated(TokenValidatedContext context)
    {
        var store = context.HttpContext.RequestServices.GetService<ISessionRevocationStore>();
        if (store == null)
            return;
        var user = context.Principal!;
        if (
            !Guid.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId)
            || !int.TryParse(user.FindFirstValue("token_version"), out var tokenVersion)
        )
        {
            context.Fail("The token carries no session claims.");
            return;
        }
        var revoked = await store.IsRevokedAsync(
            userId,
            tokenVersion,
            user.FindFirstValue(JwtRegisteredClaimNames.Jti),
            context.HttpContext.RequestAborted
        );
        if (revoked == true)
            context.Fail("Session revoked.");
        else if (revoked == null)
            context.HttpContext.Items[UncheckedItem] = true;
    }
}

/// <summary>
/// Marks a sensitive endpoint (money, approvals): when revocation could not be checked (store down) the
/// request is refused with 503 SESSION_CHECK_UNAVAILABLE instead of trusting the token.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireSessionCheckAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (context.HttpContext.Items.ContainsKey(SessionRevocationCheck.UncheckedItem))
            throw CommonErrors.SessionCheckUnavailable();
    }
}
