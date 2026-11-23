using System.Reflection;
using Caps.Common.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Common.Api;

/// <summary>Finds use-case handlers by their interfaces, so new use cases register themselves.</summary>
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
        var handlers =
            from type in assembly.GetTypes()
            where type is { IsClass: true, IsAbstract: false }
            from contract in type.GetInterfaces()
            where
                contract.IsGenericType
                && HandlerInterfaces.Contains(contract.GetGenericTypeDefinition())
            select (contract, type);
        foreach (var (contract, type) in handlers)
            services.AddScoped(contract, type);

        return services;
    }
}
