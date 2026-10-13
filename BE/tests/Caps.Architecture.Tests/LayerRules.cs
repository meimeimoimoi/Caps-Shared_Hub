namespace Caps.Architecture.Tests;

/// <summary>Clean Architecture: dependencies only point inwards (Api → Infrastructure → Application → Domain).</summary>
public sealed class LayerRules
{
    // Frameworks and adapters that belong to Infrastructure/Api, never to the core of a service
    private static readonly string[] Frameworks =
    [
        "Microsoft.EntityFrameworkCore",
        "Microsoft.AspNetCore",
        "Microsoft.Extensions.Options",
        "Npgsql",
        "MassTransit",
        "StackExchange.Redis",
        "AWSSDK",
    ];

    public static TheoryData<string> Services => new(Assemblies.LayeredServices);

    [Theory]
    [MemberData(nameof(Services))]
    public void Domain_uses_no_framework_and_no_outer_layer(string service)
    {
        var forbidden = Frameworks.Concat(
            new[] { "Application", "Infrastructure", "Api" }.Select(l =>
                Assemblies.Layer(service, l)
            )
        );
        AssertUsesNone(Assemblies.Layer(service, "Domain"), forbidden);
    }

    [Theory]
    [MemberData(nameof(Services))]
    public void Application_uses_no_framework_and_no_outer_layer(string service)
    {
        var forbidden = Frameworks.Concat(
            new[] { "Infrastructure", "Api" }.Select(l => Assemblies.Layer(service, l))
        );
        AssertUsesNone(Assemblies.Layer(service, "Application"), forbidden);
    }

    [Theory]
    [MemberData(nameof(Services))]
    public void Infrastructure_does_not_use_the_api_layer(string service) =>
        AssertUsesNone(
            Assemblies.Layer(service, "Infrastructure"),
            [Assemblies.Layer(service, "Api")]
        );

    private static void AssertUsesNone(string assembly, IEnumerable<string> forbiddenPrefixes)
    {
        var violations = Assemblies
            .ReferencesOf(assembly)
            .Where(r => forbiddenPrefixes.Any(f => r.StartsWith(f, StringComparison.Ordinal)))
            .ToList();
        Assert.True(
            violations.Count == 0,
            $"{assembly} must not use: {string.Join(", ", violations)}"
        );
    }
}
