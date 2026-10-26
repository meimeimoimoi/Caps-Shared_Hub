using Caps.Ingestion.Storage;

namespace Caps.Ingestion.Configuration;

/// <summary>Object storage for uploaded legal document files.</summary>
public static class IngestionStorageSetup
{
    /// <summary>Private object storage, validated at startup.</summary>
    public static IServiceCollection AddIngestionStorage(
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
        services.AddSingleton<IObjectStorage, S3ObjectStorage>();
        return services;
    }
}
