using Caps.Common.Exceptions;
using Caps.Common.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Caps.Common.Extensions;

/// <summary>One-liner standard API setup for every microservice.</summary>
public static class CommonApiExtensions
{
    public static IServiceCollection AddCommonApi(this IServiceCollection services, IConfiguration config, string serviceName)
    {
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(o => o.SwaggerDoc("v1", new() { Title = $"{serviceName} API", Version = "v1" }));
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();
        services.AddHealthChecks();
        services.AddCapsJwt(config);

        var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
        services.AddCors(o => o.AddPolicy("spa", p => p
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

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
        app.MapHealthChecks("/healthz");
        app.MapHealthChecks("/readyz");
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }
        return app;
    }
}
