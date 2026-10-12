using Caps.Auth.Application.Abstractions.Email;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Infrastructure.Email;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Auth.Infrastructure.Persistence.Repositories;
using Caps.Auth.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Auth.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Persistence, repositories and security adapters behind the application ports.
    /// Expects JwtOptions, AuthOptions, TimeProvider and data protection to be registered by the host.
    /// </summary>
    public static IServiceCollection AddAuthInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddDbContext<AuthDbContext>(o =>
            o.UseNpgsql(
                connectionString,
                n => n.MigrationsHistoryTable("__EFMigrationsHistory_Auth", "identity")
            )
        );
        services.AddScoped<IUnitOfWork, UnitOfWork>();
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
        return services;
    }
}
