using System.Threading.RateLimiting;
using Caps.Auth.Api.Middleware;
using Caps.Auth.Api.Swagger;
using Caps.Auth.Application;
using Caps.Auth.Application.Abstractions;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Infrastructure.Email;
using Caps.Auth.Infrastructure.Security;
using Caps.Common.Api;
using Caps.Common.Messaging;
using Caps.Common.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;

namespace Caps.Auth.Api.Configuration;

/// <summary>Host wiring for the auth service, one concern per method; Program.cs only composes them.</summary>
public static class AuthHostSetup
{
    /// <summary>Prefills the CSRF client header in Swagger UI; the rest of Swagger comes from AddCommonApi.</summary>
    public static IServiceCollection AddAuthSwagger(this IServiceCollection services)
    {
        services.ConfigureSwaggerGen(o => o.OperationFilter<SwaggerClientHeaderFilter>());
        return services;
    }

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

    /// <summary>Keys for the encrypted email outbox and the RSA keys that sign access tokens.</summary>
    public static IServiceCollection AddAuthSecrets(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        var dataProtection = services.AddDataProtection().SetApplicationName("caps-auth");
        var keys = config["Auth:DataProtectionKeysPath"];
        if (!string.IsNullOrEmpty(keys))
            dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keys));
        if (!env.IsDevelopment() && string.IsNullOrEmpty(keys))
            throw new InvalidOperationException(
                "Auth:DataProtectionKeysPath is required for durable email outbox keys."
            );
        var signingKeys = JwtSigningKeys.Load(
            config.GetSection("Jwt").Get<JwtSigningOptions>() ?? new JwtSigningOptions(),
            allowDevKey: env.IsDevelopment()
        );
        services.AddSingleton(signingKeys);
        // Auth validates its own tokens with its public keys instead of downloading its own JWKS
        services.AddSingleton<ILocalValidationKeys>(signingKeys);
        services.AddSingleton<IPublicKeySet>(signingKeys);
        return services;
    }

    /// <summary>Deliverability check at sign-up and the outbox publisher that hands emails to RabbitMQ.</summary>
    public static IServiceCollection AddAuthEmail(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        services.AddMemoryCache();
        services.Configure<EmailPolicyOptions>(config.GetSection("EmailPolicy"));
        services.AddSingleton<IEmailDomainPolicy, EmailDomainPolicy>();
        if (config.GetValue("Auth:EmailPublisherEnabled", true))
        {
            services.AddCapsMessaging(config);
            services.AddHostedService<AuthEmailPublisher>();
        }
        else if (!env.IsDevelopment())
            throw new InvalidOperationException(
                "Email publishing may only be disabled in Development."
            );
        return services;
    }

    /// <summary>Trusted proxies and the per-IP rate limit on auth endpoints.</summary>
    public static IServiceCollection AddAuthEdge(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.Configure<ForwardedHeadersOptions>(o =>
        {
            o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            foreach (var proxy in config.GetSection("Auth:KnownProxies").Get<string[]>() ?? [])
                o.KnownProxies.Add(System.Net.IPAddress.Parse(proxy));
        });
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = 429;
            o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                context.Request.Path.StartsWithSegments("/api/v1/auth")
                    ? RateLimitPartition.GetFixedWindowLimiter(
                        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 30,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        }
                    )
                    : RateLimitPartition.GetNoLimiter("other")
            );
        });
        return services;
    }

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
