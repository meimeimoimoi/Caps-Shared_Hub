using Caps.Common.Application;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Caps.Common.Persistence;

/// <summary>Where a service's DbContext lives: its connection string and the schemas it owns.</summary>
public sealed record ServiceDatabase<TContext>(string ConnectionString, IReadOnlyList<string> Schemas)
    where TContext : DbContext;

public static class ServiceDatabaseExtensions
{
    /// <summary>Reads a connection string that must be configured (user-secrets, environment).</summary>
    public static string GetRequiredConnectionString(this IConfiguration config, string name) =>
        config.GetConnectionString(name) is { Length: > 0 } value
            ? value
            : throw new InvalidOperationException($"ConnectionStrings:{name} is required.");

    /// <summary>
    /// Registers a service's own database: the DbContext on Postgres with its migration history table
    /// (<c>__EFMigrationsHistory_{serviceName}</c> in the first schema), the shared unit of work and a
    /// readiness health check.
    /// </summary>
    public static IServiceCollection AddServiceDatabase<TContext>(
        this IServiceCollection services,
        string connectionString,
        string serviceName,
        params string[] schemas
    )
        where TContext : DbContext
    {
        if (schemas.Length == 0)
            throw new ArgumentException("A service database owns at least one schema.", nameof(schemas));
        services.AddDbContext<TContext>(o =>
            o.UseNpgsql(
                connectionString,
                n => n.MigrationsHistoryTable($"__EFMigrationsHistory_{serviceName}", schemas[0])
            )
        );
        services.AddSingleton(new ServiceDatabase<TContext>(connectionString, schemas));
        services.AddScoped<IUnitOfWork, EfUnitOfWork<TContext>>();
        services.AddHealthChecks().AddDbContextCheck<TContext>("postgres", tags: [HealthTags.Ready]);
        return services;
    }

    /// <summary>
    /// Development only: creates what is missing (database, extensions, schemas) and applies migrations.
    /// Set Database:ApplyMigrations=false to skip; other environments migrate as a deployment step.
    /// </summary>
    public static IHost MigrateInDevelopment<TContext>(this IHost host)
        where TContext : DbContext
    {
        var env = host.Services.GetRequiredService<IHostEnvironment>();
        var config = host.Services.GetRequiredService<IConfiguration>();
        if (!env.IsDevelopment() || !config.GetValue("Database:ApplyMigrations", true))
            return host;
        var database = host.Services.GetRequiredService<ServiceDatabase<TContext>>();
        DbInitializer.EnsureDatabaseCreated(database.ConnectionString, [.. database.Schemas]);
        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<TContext>().Database.Migrate();
        return host;
    }
}
