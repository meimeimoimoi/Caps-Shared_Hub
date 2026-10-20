using System.Reflection;
using System.Xml.Linq;

namespace Caps.Architecture.Tests;

/// <summary>
/// Every public type of the core layers says what it is for, so a reader never has to guess from the name.
/// Members are not required: a property such as Email needs no comment.
/// </summary>
public sealed class DocumentationRules
{
    public static TheoryData<string> CoreAssemblies =>
        new(
            Assemblies
                .LayeredServices.SelectMany(s =>
                    new[] { "Domain", "Application" }.Select(l => Assemblies.Layer(s, l))
                )
                .Concat(["Caps.Common.Domain", "Caps.Common.Application", "Caps.Contracts"])
        );

    [Theory]
    [MemberData(nameof(CoreAssemblies))]
    public void Public_types_have_a_summary(string assembly)
    {
        var loaded = Assemblies.Load(assembly);
        var documented = SummarizedMembers(loaded);

        var missing = loaded
            .GetExportedTypes()
            .Where(t => !documented.Contains("T:" + t.FullName!.Replace('+', '.')))
            .Select(t => t.FullName);
        Assert.Empty(missing);
    }

    // Member ids (T:Namespace.Type) that have a <summary> in the compiler-generated XML documentation
    private static HashSet<string> SummarizedMembers(Assembly assembly)
    {
        var xml = Path.ChangeExtension(assembly.Location, ".xml");
        Assert.True(File.Exists(xml), $"{xml} is missing: GenerateDocumentationFile must stay on.");
        return XDocument
            .Load(xml)
            .Descendants("member")
            .Where(m => m.Element("summary") != null)
            .Select(m => (string)m.Attribute("name")!)
            .ToHashSet();
    }
}
