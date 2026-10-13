using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Common.Security;

public sealed class HttpContextCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? UserId => accessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    public string? Email =>
        accessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Email);
    public string? AccountStatus => accessor.HttpContext?.User.FindFirstValue("account_status");
    public string? TokenId => accessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Jti);
    public DateTimeOffset? TokenExpiresAt =>
        long.TryParse(accessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Exp), out var exp)
            ? DateTimeOffset.FromUnixTimeSeconds(exp)
            : null;
    public bool IsAuthenticated => accessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}

/// <summary>Keys a host trusts without downloading them; auth registers the public half of its signing keys.</summary>
public interface ILocalValidationKeys
{
    IEnumerable<SecurityKey> Keys { get; }
}

public static class JwtServiceCollectionExtensions
{
    /// <summary>
    /// RS256 bearer validation with public keys only: auth's JWKS (refreshed periodically and on an unknown
    /// key id, last good copy kept while auth is down), Jwt:PublicKeys as PEM fallback, and any
    /// <see cref="ILocalValidationKeys"/> the host registers.
    /// </summary>
    public static IServiceCollection AddCapsJwt(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        var options = config.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
        var fallbackKeys = options.PublicKeys.Select(RsaKeys.FromPem).ToArray();

        services.AddSingleton(options);
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpContextCurrentUser>();
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services
            .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IHostEnvironment, ILoggerFactory, IEnumerable<ILocalValidationKeys>>(
                (o, env, logs, local) =>
                {
                    o.MapInboundClaims = false;
                    // Revoked tokens (shared through Redis) are rejected as if they were never sent
                    o.Events = new JwtBearerEvents
                    {
                        OnTokenValidated = SessionRevocationCheck.OnTokenValidated,
                    };
                    o.TokenValidationParameters = new TokenValidationParameters
                    {
                        RoleClaimType = "role",
                        NameClaimType = JwtRegisteredClaimNames.Sub,
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = options.Issuer,
                        ValidAudience = options.Audience,
                        // Only RS256: a token re-signed as HS256 or "none" is rejected outright
                        ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
                        IssuerSigningKeys = fallbackKeys
                            .Concat(local.SelectMany(x => x.Keys))
                            .ToArray(),
                        ClockSkew = TimeSpan.FromMinutes(2),
                    };
                    if (string.IsNullOrWhiteSpace(options.JwksUrl))
                        return;
                    var jwks = new ConfigurationManager<OpenIdConnectConfiguration>(
                        options.JwksUrl,
                        new JwksRetriever(),
                        new HttpDocumentRetriever
                        {
                            RequireHttps = options.RequireHttpsMetadata ?? !env.IsDevelopment(),
                        }
                    )
                    {
                        AutomaticRefreshInterval = TimeSpan.FromMinutes(options.JwksRefreshMinutes),
                        // Lets a new key id (key rotation) be picked up quickly
                        RefreshInterval = TimeSpan.FromSeconds(30),
                    };
                    o.ConfigurationManager = new ResilientJwksManager(
                        jwks,
                        options.Issuer,
                        TimeProvider.System,
                        logs.CreateLogger("Caps.Common.Security.Jwks")
                    );
                    o.RefreshOnIssuerKeyNotFound = true;
                }
            );
        services.AddAuthorization(o =>
        {
            o.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .RequireClaim("account_status", "ACTIVE")
                .Build();
            o.AddPolicy("ActiveAccount", o.DefaultPolicy);
            o.AddPolicy("AuthSession", p => p.RequireAuthenticatedUser());
        });
        return services;
    }
}
