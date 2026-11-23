using Caps.Auth.Api.Swagger;

namespace Caps.Auth.Api.Configuration;

/// <summary>Swagger additions specific to auth.</summary>
public static class AuthSwaggerSetup
{
    /// <summary>Prefills the CSRF client header in Swagger UI; the rest of Swagger comes from AddCommonApi.</summary>
    public static IServiceCollection AddAuthSwagger(this IServiceCollection services)
    {
        services.ConfigureSwaggerGen(o => o.OperationFilter<SwaggerClientHeaderFilter>());
        return services;
    }
}
