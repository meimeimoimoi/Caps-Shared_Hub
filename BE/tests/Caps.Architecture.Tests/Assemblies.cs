using System.Reflection;

namespace Caps.Architecture.Tests;

/// <summary>The production assemblies under test and what each one actually uses.</summary>
internal static class Assemblies
{
    /// <summary>Services built with the four Clean Architecture projects.</summary>
    public static readonly string[] LayeredServices = ["Auth", "Expert", "Billing", "Workflow"];

    /// <summary>Services kept as one project (assembly name = project folder).</summary>
    public static readonly string[] SingleProjectServices =
    [
        "ingestion",
        "notification",
        "gateway",
    ];

    public static readonly string[] Layers = ["Domain", "Application", "Infrastructure", "Api"];

    public static Assembly Load(string name) => Assembly.Load(name);

    public static string Layer(string service, string layer) => $"Caps.{service}.{layer}";

    /// <summary>Names of the assemblies the given one references in its compiled code.</summary>
    public static IReadOnlyList<string> ReferencesOf(string assembly) =>
        Load(assembly).GetReferencedAssemblies().Select(x => x.Name!).ToList();

    /// <summary>Every assembly belonging to a service (all its layers, or its single project).</summary>
    public static IEnumerable<(string Service, string Assembly)> AllServiceAssemblies() =>
        LayeredServices
            .SelectMany(s => Layers.Select(l => (s, Layer(s, l))))
            .Concat(SingleProjectServices.Select(s => (s, s)));

    /// <summary>True when the assembly belongs to <paramref name="service"/>.</summary>
    public static bool BelongsTo(string assembly, string service) =>
        assembly.StartsWith($"Caps.{service}.", StringComparison.Ordinal) || assembly == service;
}
