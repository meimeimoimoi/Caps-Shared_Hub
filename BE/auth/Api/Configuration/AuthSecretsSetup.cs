using Caps.Auth.Application.Abstractions.Security;
using Caps.Auth.Infrastructure.Security;
using Caps.Common.Security;
using Microsoft.AspNetCore.DataProtection;

namespace Caps.Auth.Api.Configuration;

/// <summary>Data protection keys and the RSA keys that sign access tokens.</summary>
public static class AuthSecretsSetup
{
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
        {
            throw new InvalidOperationException(
                "Auth:DataProtectionKeysPath is required for durable email outbox keys."
            );
        }

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
}
