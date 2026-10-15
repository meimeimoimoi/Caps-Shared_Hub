namespace Caps.Gateway.Security;

/// <summary>Browser security headers on every gateway response.</summary>
public static class GatewaySecuritySetup
{
    /// <summary>Stops Kestrel from announcing itself in the Server header.</summary>
    public static WebApplicationBuilder HideServerHeader(this WebApplicationBuilder builder)
    {
        builder.WebHost.ConfigureKestrel(o => o.AddServerHeader = false);
        return builder;
    }

    /// <summary>Register first, so error, 401 and 429 responses get the headers too.</summary>
    public static WebApplication UseSecurityHeaders(this WebApplication app)
    {
        app.UseMiddleware<SecurityHeadersMiddleware>();
        return app;
    }
}
