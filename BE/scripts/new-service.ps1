<#
.SYNOPSIS
    Creates a new layered service (Caps.<Name>.Domain / Application / Infrastructure / Api) that follows
    the repository conventions, and registers it everywhere it must be listed.
.DESCRIPTION
    Generates the four projects from the same skeleton as billing, then:
      - adds them to Caps.sln (solution folder = service folder);
      - lists the service in the architecture tests (Assemblies.LayeredServices + Api reference);
      - adds its database role to scripts/setup-db-users.ps1.
    Run setup-db-users.ps1 again afterwards to create the role and the service's user-secrets.
.EXAMPLE
    .\new-service.ps1 -Name Payment -Port 5230
.EXAMPLE
    .\new-service.ps1 -Name ReviewBoard -Schema review_board -Port 5240
#>
param(
    [Parameter(Mandatory)] [ValidatePattern('^[A-Z][A-Za-z]+$')] [string]$Name,
    [Parameter(Mandatory)] [ValidateRange(1024, 65535)] [int]$Port,
    # Postgres schema; defaults to the lower-case name
    [ValidatePattern('^[a-z][a-z_]*$')] [string]$Schema
)

$ErrorActionPreference = "Stop"
$beRoot = Split-Path -Parent $PSScriptRoot
$folder = $Name.ToLowerInvariant()
if (-not $Schema) { $Schema = $folder }
$serviceDir = Join-Path $beRoot $folder
if (Test-Path $serviceDir) { throw "$serviceDir already exists." }

# Writes UTF-8 without BOM, with the placeholders replaced
function Write-Template([string]$RelativePath, [string]$Text) {
    $path = Join-Path $serviceDir $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null
    $content = $Text.Replace("__Name__", $Name).Replace("__folder__", $folder).Replace("__schema__", $Schema).Replace("__port__", "$Port")
    [IO.File]::WriteAllText($path, $content.TrimStart())
}

# ---------- Domain ----------
Write-Template "Caps.$Name.Domain/Caps.$Name.Domain.csproj" @'
<Project Sdk="Microsoft.NET.Sdk">

  <ItemGroup>
    <ProjectReference Include="..\..\common\Caps.Common.Domain\Caps.Common.Domain.csproj" />
  </ItemGroup>

</Project>
'@

# ---------- Application ----------
Write-Template "Caps.$Name.Application/Caps.$Name.Application.csproj" @'
<Project Sdk="Microsoft.NET.Sdk">

  <ItemGroup>
    <ProjectReference Include="..\Caps.__Name__.Domain\Caps.__Name__.Domain.csproj" />
    <ProjectReference Include="..\..\common\Caps.Common.Application\Caps.Common.Application.csproj" />
  </ItemGroup>

</Project>
'@

Write-Template "Caps.$Name.Application/${Name}Application.cs" @'
using System.Reflection;

namespace Caps.__Name__.Application;

/// <summary>
/// Assembly anchor: use cases go under Features/&lt;Group&gt;/ and their handlers register automatically.
/// </summary>
public static class __Name__Application
{
    public static Assembly Assembly => typeof(__Name__Application).Assembly;
}
'@

# ---------- Infrastructure ----------
Write-Template "Caps.$Name.Infrastructure/Caps.$Name.Infrastructure.csproj" @'
<Project Sdk="Microsoft.NET.Sdk">

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />
    <ProjectReference Include="..\Caps.__Name__.Application\Caps.__Name__.Application.csproj" />
    <ProjectReference Include="..\..\common\Caps.Common.Persistence\Caps.Common.Persistence.csproj" />
  </ItemGroup>

</Project>
'@

Write-Template "Caps.$Name.Infrastructure/Persistence/${Name}DbContext.cs" @'
using Microsoft.EntityFrameworkCore;

namespace Caps.__Name__.Infrastructure.Persistence;

/// <summary>The __folder__ service's database (schema __schema__).</summary>
public sealed class __Name__DbContext(DbContextOptions<__Name__DbContext> options) : DbContext(options)
{
    public const string Schema = "__schema__";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);

        // Ids of other services' data (users, review cases...) are plain columns: no cross-service foreign keys
    }
}
'@

Write-Template "Caps.$Name.Infrastructure/DependencyInjection.cs" @'
using Caps.__Name__.Infrastructure.Persistence;
using Caps.Common.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.__Name__.Infrastructure;

/// <summary>Registers the __folder__ adapters, starting with its database.</summary>
public static class DependencyInjection
{
    /// <summary>The __folder__ database (shared unit of work, readiness check) behind the application ports.</summary>
    public static IServiceCollection Add__Name__Infrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddServiceDatabase<__Name__DbContext>(connectionString, "__Name__", __Name__DbContext.Schema);
        return services;
    }
}
'@

# ---------- Api ----------
Write-Template "Caps.$Name.Api/Caps.$Name.Api.csproj" @'
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <UserSecretsId>caps-shared-hub-__folder__</UserSecretsId>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" />
    <PackageReference Include="Swashbuckle.AspNetCore" />
    <PackageReference Include="OpenApiUi" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" />
    <ProjectReference Include="..\Caps.__Name__.Infrastructure\Caps.__Name__.Infrastructure.csproj" />
    <ProjectReference Include="..\..\common\Caps.Common.Api\Caps.Common.Api.csproj" />
  </ItemGroup>

</Project>
'@

Write-Template "Caps.$Name.Api/DependencyInjection.cs" @'
using Caps.__Name__.Application;
using Caps.Common.Api;

namespace Caps.__Name__.Api;

/// <summary>Registers the __folder__ Application layer (every use-case handler).</summary>
public static class DependencyInjection
{
    /// <summary>Every command/query handler found in the Application assembly.</summary>
    public static IServiceCollection Add__Name__Application(this IServiceCollection services) =>
        services.AddHandlersFromAssembly(__Name__Application.Assembly);
}
'@

Write-Template "Caps.$Name.Api/Program.cs" @'
using Caps.__Name__.Api;
using Caps.__Name__.Infrastructure;
using Caps.__Name__.Infrastructure.Persistence;
using Caps.Common.Api;
using Caps.Common.Persistence;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var postgres = config.GetRequiredConnectionString("Postgres");

builder.Services.AddCommonApi(config, "__folder__");
builder.Services.Add__Name__Application();
builder.Services.Add__Name__Infrastructure(postgres);

var app = builder.Build();
app.MigrateInDevelopment<__Name__DbContext>();
app.UseCommonApi();
app.Run();
'@

Write-Template "Caps.$Name.Api/appsettings.json" @'
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "Redis": "localhost:6379",
    "RabbitMq": "amqp://guest:guest@localhost:5672"
  },
  "Jwt": {
    "Issuer": "caps-auth",
    "Audience": "caps-spa",
    "JwksUrl": "http://localhost:5194/.well-known/jwks.json"
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173"
    ]
  }
}
'@

Write-Template "Caps.$Name.Api/appsettings.Development.json" @'
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "System": "Information",
      "Microsoft": "Information"
    }
  }
}
'@

Write-Template "Caps.$Name.Api/Properties/launchSettings.json" @'
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "launchBrowser": true,
      "launchUrl": "swagger",
      "applicationUrl": "http://localhost:__port__",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
'@

Copy-Item (Join-Path $beRoot "billing/.gitignore") (Join-Path $serviceDir ".gitignore")

# ---------- Register the service where it must be listed ----------
Push-Location $beRoot
try {
    foreach ($layer in "Domain", "Application", "Infrastructure", "Api") {
        # An open IDE may hold Caps.sln for a moment while it reloads, so retry briefly
        for ($attempt = 1; $attempt -le 5; $attempt++) {
            dotnet sln Caps.sln add --solution-folder $folder "$folder/Caps.$Name.$layer/Caps.$Name.$layer.csproj" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { break }
            Start-Sleep -Seconds 2
        }
        if ($LASTEXITCODE -ne 0) { throw "dotnet sln add failed for Caps.$Name.$layer (is Caps.sln locked?)." }
    }

    # Architecture tests: check the new service and load its assemblies
    $assemblies = Join-Path $beRoot "tests/Caps.Architecture.Tests/Assemblies.cs"
    $text = [IO.File]::ReadAllText($assemblies)
    # Works whether the list is on one line or spread over several with a trailing comma
    $text = [regex]::Replace($text, '(LayeredServices\s*=\s*\[[^\]]*?)\s*,?(\s*\])', "`$1, `"$Name`"`$2", 1)
    [IO.File]::WriteAllText($assemblies, $text)
    $testProject = Join-Path $beRoot "tests/Caps.Architecture.Tests/Caps.Architecture.Tests.csproj"
    $text = [IO.File]::ReadAllText($testProject)
    $reference = "    <ProjectReference Include=`"..\..\$folder\Caps.$Name.Api\Caps.$Name.Api.csproj`" />"
    $text = [regex]::Replace($text, '(\r?\n)(\s*<ProjectReference Include="\.\.\\\.\.\\ingestion)', "`$1$reference`$1`$2", 1)
    [IO.File]::WriteAllText($testProject, $text)

    # Database role owning the new schema
    $setup = Join-Path $beRoot "scripts/setup-db-users.ps1"
    $text = [IO.File]::ReadAllText($setup)
    $entry = "    @{ Role = `"caps_$folder`"; Schemas = @(`"$Schema`"); Project = `"$folder\Caps.$Name.Api`" }"
    $text = [regex]::Replace($text, '(?s)(\$services = @\(.*?)(\r?\n)\)', "`$1,`$2$entry`$2)", 1)
    [IO.File]::WriteAllText($setup, $text)

    dotnet csharpier format $folder "tests/Caps.Architecture.Tests" | Out-Null
} finally {
    Pop-Location
}

Write-Host "Created $folder/ (Caps.$Name.*), schema '$Schema', port $Port." -ForegroundColor Green
Write-Host "Registered in Caps.sln, the architecture tests and setup-db-users.ps1." -ForegroundColor Green
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  1. .\scripts\setup-db-users.ps1                      (creates caps_$folder + its user-secrets)"
Write-Host "  2. Add entities, then: dotnet ef migrations add Initial$Name --project $folder/Caps.$Name.Infrastructure --startup-project $folder/Caps.$Name.Api --output-dir Persistence/Migrations"
Write-Host "  3. Route its API through gateway/appsettings.json, and add it to docker/docker-compose.yml when it ships"
