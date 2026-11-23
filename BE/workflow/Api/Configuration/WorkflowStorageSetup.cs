using Caps.Workflow.Infrastructure.Storage;

namespace Caps.Workflow.Api.Configuration;

/// <summary>Object storage for evidence files; the shared host parts come from AddCommonApi.</summary>
public static class WorkflowStorageSetup
{
    /// <summary>Private object storage for evidence files, validated at startup.</summary>
    public static IServiceCollection AddWorkflowStorage(
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
