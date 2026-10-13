using Caps.Auth.Application;

namespace Caps.Auth.Api.Configuration;

/// <summary>Auth settings and the refresh cookie, validated at startup.</summary>
public static class AuthSettingsSetup
{
    /// <summary>Auth settings and refresh cookie, validated at startup.</summary>
    public static IServiceCollection AddAuthSettings(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        services
            .AddOptions<AuthOptions>()
            .Bind(config.GetSection("Auth"))
            .Validate(
                x =>
                    x.AccessMinutes > 0
                    && x.AccessMinutes <= 60
                    && x.RefreshDays > 0
                    && x.MaxFailedAttempts > 0
                    && x.LockoutMinutes > 0
                    && x.EmailCooldownSeconds > 0
                    && x.VerificationMinutes > 0
                    && x.ResetMinutes > 0,
                "Invalid Auth expiration or security options."
            )
            .Validate(
                x =>
                    Uri.TryCreate(x.FrontendUrl, UriKind.Absolute, out var u)
                    && (u.Scheme == "http" || u.Scheme == "https"),
                "Auth:FrontendUrl must be absolute."
            )
            .ValidateOnStart();
        services
            .AddOptions<RefreshCookieOptions>()
            .Bind(config.GetSection("Auth"))
            .Validate(
                x => env.IsDevelopment() || x.SecureCookie,
                "Secure cookies are required outside Development."
            )
            .ValidateOnStart();
        services.AddSingleton<RefreshCookie>();
        return services;
    }
}
