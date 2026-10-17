using Caps.Auth.Application.Abstractions.Email;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Infrastructure.Email;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Auth.Infrastructure.Persistence.Repositories;
using Caps.Auth.Infrastructure.Security;
using Caps.Common.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Auth.Infrastructure;

/// <summary>Registers the auth adapters: database, repositories, password hashing, tokens and email outbox.</summary>
public static class DependencyInjection
{
    /// <summary>
    /// The auth database (schema identity, shared unit of work, readiness check), repositories and
    /// security adapters behind the application ports.
    /// Expects JwtOptions, AuthOptions, TimeProvider and data protection to be registered by the host.
    /// </summary>
    public static IServiceCollection AddAuthInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddServiceDatabase<AuthDbContext>(connectionString, "Auth", AuthDbContext.Schema);
        services.AddScoped<UserRepository>();
        services.AddScoped<IUserRepository>(sp => sp.GetRequiredService<UserRepository>());
        services.AddScoped<IUserAccessReader>(sp => sp.GetRequiredService<UserRepository>());
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IVerificationTokenRepository, VerificationTokenRepository>();
        services.AddScoped<IUserAvatarRepository, UserAvatarRepository>();
        services.AddScoped<IBusinessProfileRepository, BusinessProfileRepository>();
        services.AddScoped<IAuthEmailOutbox, AuthEmailOutboxWriter>();
        services.AddSingleton<IPasswordHasher, AspNetPasswordHasher>();
        services.AddSingleton<IAccessTokenIssuer, JwtAccessTokenIssuer>();
        services.AddSingleton<IGoogleIdTokenValidator, GoogleIdTokenValidator>();
        return services;
    }
}
