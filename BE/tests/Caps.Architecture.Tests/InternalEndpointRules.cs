using System.Reflection;
using Caps.Common.Domain;
using Caps.Common.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Architecture.Tests;

/// <summary>
/// Endpoints other services call live under internal/ and carry the internal key check, so a forgotten
/// attribute fails the build instead of opening a money path.
/// </summary>
public sealed class InternalEndpointRules
{
    private const string Key = "0123456789abcdef0123456789abcdef";

    public static TheoryData<string> ApiAssemblies =>
        [
            .. Assemblies.LayeredServices.Select(s => Assemblies.Layer(s, "Api")),
            .. Assemblies.SingleProjectServices,
        ];

    [Theory]
    [MemberData(nameof(ApiAssemblies))]
    public void Internal_controllers_require_the_internal_key(string assembly)
    {
        var unguarded = Assemblies
            .Load(assembly)
            .GetTypes()
            .Where(t => t.IsSubclassOf(typeof(ControllerBase)))
            .Where(t =>
                t.GetCustomAttributes<RouteAttribute>()
                    .Any(r => r.Template.StartsWith("internal", StringComparison.OrdinalIgnoreCase))
            )
            // By name: ingestion still has its own copy of the attribute
            .Where(t =>
                !t.GetCustomAttributes()
                    .Any(a => a.GetType().Name == nameof(RequireInternalKeyAttribute))
            )
            .Select(t => t.Name);
        Assert.Empty(unguarded);
    }

    [Fact]
    public void The_right_key_passes() => Check(Key, Key);

    [Theory]
    [InlineData(Key, "wrong")] // wrong key
    [InlineData(Key, null)] // no header
    [InlineData("", "")] // not configured
    public void Anything_else_is_rejected(string configured, string? sent)
    {
        var e = Assert.Throws<AppException>(() => Check(configured, sent));
        Assert.Equal("INTERNAL_KEY_INVALID", e.Code);
    }

    private static void Check(string configured, string? sent)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(
                new Dictionary<string, string?> { ["InternalApi:Key"] = configured }
            )
            .Build();
        var http = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection()
                .AddSingleton<IConfiguration>(config)
                .BuildServiceProvider(),
        };
        if (sent != null)
            http.Request.Headers[RequireInternalKeyAttribute.Header] = sent;
        var context = new AuthorizationFilterContext(
            new ActionContext(http, new RouteData(), new ActionDescriptor()),
            []
        );
        new RequireInternalKeyAttribute().OnAuthorization(context);
    }
}
