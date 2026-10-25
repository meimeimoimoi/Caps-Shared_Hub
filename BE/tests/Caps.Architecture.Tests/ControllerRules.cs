using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Architecture.Tests;

/// <summary>Controllers only map HTTP to use cases: they depend on Application types, never on Infrastructure.</summary>
public sealed class ControllerRules
{
    public static TheoryData<string> Services => [.. Assemblies.LayeredServices];

    [Theory]
    [MemberData(nameof(Services))]
    public void Controllers_do_not_depend_on_infrastructure(string service)
    {
        var infrastructure = Assemblies.Layer(service, "Infrastructure");
        var controllers = Assemblies
            .Load(Assemblies.Layer(service, "Api"))
            .GetTypes()
            .Where(t => t.IsSubclassOf(typeof(ControllerBase)));

        var violations =
            from controller in controllers
            from dependency in DependenciesOf(controller)
            where dependency.Assembly.GetName().Name == infrastructure
            select $"{controller.Name} → {dependency.Name}";
        Assert.Empty(violations);
    }

    // Constructor parameters and [FromServices] action parameters
    private static IEnumerable<Type> DependenciesOf(Type controller) =>
        controller
            .GetConstructors()
            .SelectMany(c => c.GetParameters())
            .Concat(
                controller
                    .GetMethods(
                        BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly
                    )
                    .SelectMany(m => m.GetParameters())
                    .Where(p => p.GetCustomAttribute<FromServicesAttribute>() != null)
            )
            .Select(p => p.ParameterType);
}
