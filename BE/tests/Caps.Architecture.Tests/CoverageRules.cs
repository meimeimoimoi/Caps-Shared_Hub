namespace Caps.Architecture.Tests;

/// <summary>A new layered service cannot slip past the rules: it must be listed in <see cref="Assemblies"/>.</summary>
public sealed class CoverageRules
{
    [Fact]
    public void Every_layered_service_is_checked()
    {
        var found = Directory
            .EnumerateDirectories(BackendRoot(), "Caps.*.Domain", SearchOption.AllDirectories)
            .Select(Path.GetFileName)
            .Where(name => !name!.StartsWith("Caps.Common.", StringComparison.Ordinal))
            .Select(name => name!["Caps.".Length..^".Domain".Length]);

        var missing = found.Except(Assemblies.LayeredServices);
        Assert.True(
            !missing.Any(),
            $"Add {string.Join(", ", missing)} to Assemblies.LayeredServices and reference its Api project."
        );
    }

    // The BE folder: the closest parent of the test output that holds Caps.sln
    private static string BackendRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "Caps.sln")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Caps.sln not found.");
    }
}
