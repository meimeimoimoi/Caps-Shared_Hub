using Caps.Common.Persistence;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Infrastructure.Persistence;
using Caps.Expert.Infrastructure.Storage;
using Microsoft.Extensions.DependencyInjection;
using static Caps.Expert.Infrastructure.Persistence.ExpertEvidenceRepository;

namespace Caps.Expert.Infrastructure;

/// <summary>Registers the expert adapters: database, repositories and object storage.</summary>
public static class DependencyInjection
{
    /// <summary>
    /// Persistence and storage behind the application ports. Expects StorageOptions and TimeProvider
    /// to be registered by the host.
    /// </summary>
    public static IServiceCollection AddExpertInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddServiceDatabase<ExpertDbContext>(
            connectionString,
            "Expert",
            ExpertDbContext.Schema
        );
        services.AddScoped<IApplicantLock, ApplicantLock>();
        services.AddScoped<IExpertProfileRepository, ExpertProfileRepository>();
        services.AddScoped<IExpertApplicationRepository, ExpertApplicationRepository>();
        services.AddScoped<IExpertEvidenceRepository, ExpertEvidenceRepository>();
        services.AddScoped<IMarketplaceReader, MarketplaceReader>();
        services.AddSingleton<IObjectStorage, S3ObjectStorage>();
        return services;
    }
}
