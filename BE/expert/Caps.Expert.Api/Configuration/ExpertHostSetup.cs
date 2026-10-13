using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Expert.Infrastructure.Persistence;
using Caps.Expert.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

namespace Caps.Expert.Api.Configuration;

/// <summary>Host wiring for the expert service, one concern per method; Program.cs only composes them.</summary>
public static class ExpertHostSetup
{
    public static IServiceCollection AddExpertSwagger(this IServiceCollection services) =>
        services.AddSwaggerGen(o =>
        {
            o.AddSecurityDefinition(
                "Bearer",
                new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                }
            );
            o.AddSecurityRequirement(
                new OpenApiSecurityRequirement
                {
                    [
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer",
                            },
                        }
                    ] = Array.Empty<string>(),
                }
            );
            // Show the controllers' XML comments (summary, remarks, response codes) in Swagger UI
            o.IncludeXmlComments(
                Path.Combine(
                    AppContext.BaseDirectory,
                    $"{typeof(ExpertHostSetup).Assembly.GetName().Name}.xml"
                )
            );
        });

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

    public static WebApplication UseExpertPipeline(this WebApplication app, string connectionString)
    {
        if (
            app.Environment.IsDevelopment()
            && app.Configuration.GetValue("Expert:ApplyMigrations", true)
        )
        {
            DbInitializer.EnsureDatabaseCreated(connectionString, ExpertDbContext.Schema);
            using var scope = app.Services.CreateScope();
            scope.ServiceProvider.GetRequiredService<ExpertDbContext>().Database.Migrate();
        }
        app.UseCommonApi();
        return app;
    }
}
