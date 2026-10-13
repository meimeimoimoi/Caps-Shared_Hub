using Caps.Common.Api;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.Features.Applications;

namespace Caps.Expert.Api;

public static class DependencyInjection
{
    /// <summary>Application services plus every command/query handler found in the Application assembly.</summary>
    public static IServiceCollection AddExpertApplication(this IServiceCollection services)
    {
        services.AddScoped<IApplicationLoader, ApplicationLoader>();
        services.AddScoped<IApplicationDescriber, ApplicationDescriber>();
        services.AddHandlersFromAssembly(typeof(SaveDraftHandler).Assembly);
        return services;
    }
}
