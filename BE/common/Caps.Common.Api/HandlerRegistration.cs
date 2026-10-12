using System.Reflection;
using Caps.Common.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Common.Api;

public static class HandlerRegistration
{
    private static readonly Type[] HandlerInterfaces =
    [
        typeof(ICommandHandler<,>),
        typeof(ICommandHandler<>),
        typeof(IQueryHandler<,>),
    ];

    /// <summary>
    /// Registers every concrete command/query handler in the assembly as scoped,
    /// so adding a use case never requires touching the composition root.
    /// </summary>
    public static IServiceCollection AddHandlersFromAssembly(
        this IServiceCollection services,
        Assembly assembly
    )
    {
        foreach (
            var type in assembly.GetTypes().Where(t => t is { IsClass: true, IsAbstract: false })
        )
        foreach (
            var contract in type.GetInterfaces()
                .Where(i =>
                    i.IsGenericType && HandlerInterfaces.Contains(i.GetGenericTypeDefinition())
                )
        )
            services.AddScoped(contract, type);
        return services;
    }
}
