using Caps.Auth.Application;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.Features.Sessions;
using Caps.Common.Api;
using Microsoft.Extensions.Options;

namespace Caps.Auth.Api;

public static class DependencyInjection
{
    /// <summary>Application services plus every command/query handler found in the Application assembly.</summary>
    public static IServiceCollection AddAuthApplication(this IServiceCollection services)
    {
        // Handlers take the plain options object so the Application layer does not depend on IOptions
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<AuthOptions>>().Value);
        services.AddScoped<IUserProfileReader, UserProfileReader>();
        services.AddScoped<ISessionIssuer, SessionIssuer>();
        services.AddScoped<IAccountEmailQueue, AccountEmailQueue>();
        services.AddScoped<IVerificationTokenRedeemer, VerificationTokenRedeemer>();
        services.AddScoped<ISessionGuard, SessionGuard>();
        services.AddHandlersFromAssembly(typeof(LoginHandler).Assembly);
        return services;
    }
}
