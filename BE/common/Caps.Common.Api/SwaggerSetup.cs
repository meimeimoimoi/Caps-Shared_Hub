using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;

namespace Caps.Common.Api;

/// <summary>Swagger for every service: a bearer token button and the controllers' XML comments.</summary>
internal static class SwaggerSetup
{
    public static IServiceCollection AddCapsSwagger(
        this IServiceCollection services,
        string serviceName
    ) =>
        services.AddSwaggerGen(o =>
        {
            o.SwaggerDoc("v1", new() { Title = $"{serviceName} API", Version = "v1" });
            var bearer = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            };
            o.AddSecurityDefinition("Bearer", bearer);
            o.AddSecurityRequirement(new OpenApiSecurityRequirement { [bearer] = [] });
            // Summary, remarks and response codes of the API project, when it generates its XML docs
            var xml = Path.Combine(
                AppContext.BaseDirectory,
                $"{Assembly.GetEntryAssembly()?.GetName().Name}.xml"
            );
            if (File.Exists(xml))
                o.IncludeXmlComments(xml);
        });
}
