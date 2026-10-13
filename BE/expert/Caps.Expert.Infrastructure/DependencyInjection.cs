using Caps.Expert.Application.Abstractions;
using Caps.Expert.Infrastructure.Persistence;
using Caps.Expert.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Expert.Infrastructure;

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
        services.AddDbContext<ExpertDbContext>(o =>
            o.UseNpgsql(
                connectionString,
                n =>
                    n.MigrationsHistoryTable("__EFMigrationsHistory_Expert", ExpertDbContext.Schema)
            )
        );
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IApplicantLock, ApplicantLock>();
        services.AddScoped<IExpertProfileRepository, ExpertProfileRepository>();
        services.AddScoped<IExpertApplicationRepository, ExpertApplicationRepository>();
        services.AddScoped<IExpertEvidenceRepository, ExpertEvidenceRepository>();
        services.AddSingleton<IObjectStorage, S3ObjectStorage>();
        return services;
    }
}
