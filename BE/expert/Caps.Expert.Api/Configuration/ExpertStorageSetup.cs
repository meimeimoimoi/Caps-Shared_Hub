using Caps.Expert.Infrastructure.Storage;

namespace Caps.Expert.Api.Configuration;

/// <summary>Host wiring specific to the expert service; the shared parts come from AddCommonApi.</summary>
public static class ExpertHostSetup
{
    /// <summary>Private object storage for evidence files, validated at startup.</summary>
    public static IServiceCollection AddExpertStorage(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        services
            .AddOptions<StorageOptions>()
            .Bind(config.GetSection("Storage"))
            .Validate(
                x => !string.IsNullOrEmpty(x.AccessKey) && !string.IsNullOrEmpty(x.SecretKey),
                "Storage:AccessKey and Storage:SecretKey are required."
            )
            .Validate(
                x => env.IsDevelopment() || !x.CreateBucket,
                "Storage:CreateBucket may only be enabled in Development."
            )
            .ValidateOnStart();
        return services;
    }
}
