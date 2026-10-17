using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Caps.Common.Api;

/// <summary>
/// Everything a service shares: controllers, Swagger, error format, health endpoints, JWT validation,
/// session revocation, CORS and the clock. A service adds only its own features on top.
/// </summary>
public static class CommonApiExtensions
{
    public static IServiceCollection AddCommonApi(
        this IServiceCollection services,
        IConfiguration config,
        string serviceName
    )
    {
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddCapsSwagger(serviceName);
        services.TryAddSingleton(TimeProvider.System);
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();
        services.AddHealthChecks();
        services.AddCapsJwt(config);
        services.AddCapsSessionRevocation(config);

        var origins =
            config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
        services.AddCors(o =>
            o.AddPolicy(
                "spa",
                p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()
            )
        );

        return services;
    }

    public static WebApplication UseCommonApi(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseCors("spa");
        // NOTE: UseAuthentication must come before UseAuthorization (was missing in template).
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        // Liveness: the process answers. Readiness: its dependencies (database) answer too.
        app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false });
        app.MapHealthChecks(
            "/readyz",
            new HealthCheckOptions { Predicate = x => x.Tags.Contains(HealthTags.Ready) }
        );
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }
        return app;
    }
}
