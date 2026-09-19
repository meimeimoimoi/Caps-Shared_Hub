using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Caps.Common.Abstractions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Caps.Common.Security;

public sealed record JwtOptions(string Issuer, string Audience, string Key, int ExpiryMinutes = 60);

public interface IJwtTokenService
{
    string CreateToken(string userId, string email);
}

public sealed class JwtTokenService(JwtOptions options, IDateTimeProvider clock) : IJwtTokenService
{
    public string CreateToken(string userId, string email)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var now = clock.UtcNow.UtcDateTime;
        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: [new Claim(JwtRegisteredClaimNames.Sub, userId), new Claim(JwtRegisteredClaimNames.Email, email)],
            notBefore: now,
            expires: now.AddMinutes(options.ExpiryMinutes),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public sealed class HttpContextCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? UserId => accessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    public string? Email => accessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Email);
    public bool IsAuthenticated => accessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}

public static class JwtServiceCollectionExtensions
{
    public static IServiceCollection AddCapsJwt(this IServiceCollection services, IConfiguration config)
    {
        var section = config.GetSection("Jwt");
        var options = new JwtOptions(
            section["Issuer"] ?? "caps-auth",
            section["Audience"] ?? "caps-spa",
            section["Key"] ?? throw new InvalidOperationException("Missing Jwt:Key"),
            int.TryParse(section["ExpiryMinutes"], out var m) ? m : 60);

        services.AddSingleton(options);
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpContextCurrentUser>();

        var keyBytes = Encoding.UTF8.GetBytes(options.Key);
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = options.Issuer,
                    ValidAudience = options.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                    ClockSkew = TimeSpan.FromMinutes(2),
                };
            });
        services.AddAuthorization();
        return services;
    }
}
