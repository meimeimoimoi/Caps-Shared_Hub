using Caps.Auth.Api.Middleware;
using Caps.Common.Api;

namespace Caps.Auth.Api.Configuration;

/// <summary>The auth middleware pipeline, in the order the guards must run.</summary>
public static class AuthPipelineSetup
{
    /// <summary>Middleware order matters: forwarded headers, authentication, CSRF and session guards, rate limit, then the shared API pipeline.</summary>
    public static WebApplication UseAuthPipeline(this WebApplication app)
    {
        app.UseForwardedHeaders();
        app.UseRouting();
        app.UseAuthentication();
        app.UseMiddleware<CsrfGuardMiddleware>();
        app.UseMiddleware<SessionGuardMiddleware>();
        app.UseRateLimiter();
        app.UseCommonApi();
        return app;
    }
}
