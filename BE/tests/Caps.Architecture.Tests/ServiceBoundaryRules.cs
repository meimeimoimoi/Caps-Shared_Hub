namespace Caps.Architecture.Tests;

/// <summary>Microservices: a service shares only common building blocks and contracts, never another service's code.</summary>
public sealed class ServiceBoundaryRules
{
    private static readonly string[] AllServices =
    [
        .. Assemblies.LayeredServices,
        .. Assemblies.SingleProjectServices,
    ];

    [Fact]
    public void Services_do_not_use_each_other()
    {
        var violations =
            from owner in Assemblies.AllServiceAssemblies()
            from reference in Assemblies.ReferencesOf(owner.Assembly)
            from other in AllServices
            where other != owner.Service && Assemblies.BelongsTo(reference, other)
            select $"{owner.Assembly} → {reference}";
        Assert.Empty(violations);
    }

    [Theory]
    [InlineData("Caps.Common.Domain")]
    [InlineData("Caps.Common.Application")]
    [InlineData("Caps.Common.Security")]
    [InlineData("Caps.Common.Api")]
    [InlineData("Caps.Common.Messaging")]
    [InlineData("Caps.Common.Persistence")]
    [InlineData("Caps.Contracts")]
    public void Common_never_uses_a_service(string common)
    {
        var violations = Assemblies
            .ReferencesOf(common)
            .Where(r => AllServices.Any(s => Assemblies.BelongsTo(r, s)));
        Assert.Empty(violations);
    }
}
