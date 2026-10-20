using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
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
        services.AddSingleton(new SwaggerUiRoute($"/swagger/{serviceName}"));
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
        app.MapGet("/health", () => Results.Text("Healthy", "text/plain"))
            .AllowAnonymous()
            .WithTags("Health")
            .WithSummary("Checks whether the service is running.")
            .Produces<string>(StatusCodes.Status200OK, "text/plain");
        app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false });
        app.MapHealthChecks(
            "/readyz",
            new HealthCheckOptions { Predicate = x => x.Tags.Contains(HealthTags.Ready) }
        );
        if (app.Environment.IsDevelopment())
        {
            var uiRoute = app.Services.GetRequiredService<SwaggerUiRoute>().Path;
            // Serve the index internally so the browser keeps the service URL.
            app.Use(
                async (context, next) =>
                {
                    var originalPath = context.Request.Path;
                    if (originalPath == uiRoute)
                        context.Request.Path = "/swagger/index.html";
                    try
                    {
                        await next(context);
                    }
                    finally
                    {
                        context.Request.Path = originalPath;
                    }
                }
            );
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.RoutePrefix = "swagger";
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
            });
        }
        return app;
    }

    private sealed record SwaggerUiRoute(string Path);
}
