using Caps.Billing.Infrastructure.Security;
using Microsoft.AspNetCore.DataProtection;

namespace Caps.Billing.Api.Configuration;

/// <summary>Data protection keys and the hash key that protect stored bank account numbers.</summary>
public static class BillingSecretsSetup
{
    /// <summary>
    /// Outside Development both secrets are required: lost Data Protection keys make every stored
    /// account number unreadable, and a changed hash key breaks duplicate detection.
    /// </summary>
    public static IServiceCollection AddBillingSecrets(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        var dataProtection = services.AddDataProtection().SetApplicationName("caps-billing");
        var keys = config["Billing:DataProtectionKeysPath"];
        if (!string.IsNullOrEmpty(keys))
            dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keys));
        if (!env.IsDevelopment() && string.IsNullOrEmpty(keys))
        {
            throw new InvalidOperationException(
                "Billing:DataProtectionKeysPath is required for durable bank account encryption keys."
            );
        }

        var hashKey = config["Billing:AccountHashKey"];
        if (string.IsNullOrEmpty(hashKey))
            throw new InvalidOperationException("Billing:AccountHashKey is required.");
        services.AddSingleton(new AccountNumberProtectionOptions { HashKey = hashKey });
        return services;
    }
}
