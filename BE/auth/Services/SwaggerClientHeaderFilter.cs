using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
namespace auth.Services;
// Swagger UI chỉ bật ở Development; điền sẵn X-Caps-Client để thử các mutation /api/v1/auth mà AuthBoundaryMiddleware yêu cầu.
public sealed class SwaggerClientHeaderFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var path = context.ApiDescription.RelativePath ?? "";
        if (context.ApiDescription.HttpMethod == "GET" || !path.StartsWith("api/v1/auth", StringComparison.OrdinalIgnoreCase)) return;
        operation.Parameters ??= [];
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Caps-Client",
            In = ParameterLocation.Header,
            Required = true,
            Description = "Chống CSRF: frontend luôn gửi giá trị spa.",
            Schema = new OpenApiSchema { Type = "string", Default = new OpenApiString("spa") }
        });
    }
}
