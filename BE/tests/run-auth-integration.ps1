param([string]$Dotnet = "dotnet", [string]$Connection = "Host=127.0.0.1;Port=55432;Database=caps_auth_test;Username=caps_auth_test")
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$testArtifacts = Join-Path $repoRoot ".tmp/auth-tests"
New-Item -ItemType Directory -Force -Path $testArtifacts | Out-Null
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ConnectionStrings__Postgres = $Connection
$env:Auth__DataProtectionKeysPath = Join-Path $repoRoot ".tmp/auth-test-keys"
$env:Auth__EmailPublisherEnabled = "false"
$env:Logging__LogLevel__Default = "Warning"
$env:Logging__LogLevel__Microsoft = "Warning"
$env:AUTH_TEST_CONNECTION = $Connection
$env:AUTH_TEST_KEYS = $env:Auth__DataProtectionKeysPath
# Auth (Development) creates its RSA signing key here; the in-process checks sign with the same key
$env:Jwt__DevKeyPath = Join-Path $repoRoot ".tmp/auth-test-keys/jwt-signing-key.pem"
$env:AUTH_TEST_JWT_KEY = $env:Jwt__DevKeyPath
$env:AUTH_TEST_AUTH_URL = "http://127.0.0.1:55194"
$env:AUTH_TEST_URL = "http://127.0.0.1:55190"
# Build the services and the test runner first so the run never uses stale binaries
& $Dotnet build (Join-Path $repoRoot "BE/Caps.sln") --nologo -v q
if ($LASTEXITCODE -ne 0) { throw "Solution build failed." }
& $Dotnet build (Join-Path $repoRoot "BE/tests/Auth.IntegrationTests") --nologo -v q
if ($LASTEXITCODE -ne 0) { throw "Test project build failed." }
# Hide the server consoles on Windows; -WindowStyle does not exist on Linux (CI)
$hidden = @{}
if ($env:OS -eq "Windows_NT") { $hidden.WindowStyle = "Hidden" }
$services = @()
try {
    $env:ASPNETCORE_URLS = "http://127.0.0.1:55194"
    $authDll = Join-Path $repoRoot "BE/auth/Api/bin/Debug/net9.0/Caps.Auth.Api.dll"
    $services += Start-Process -FilePath $Dotnet -ArgumentList ('"' + $authDll + '"') -WorkingDirectory (Join-Path $repoRoot "BE/auth/Api") @hidden -PassThru -RedirectStandardOutput (Join-Path $testArtifacts "auth.log") -RedirectStandardError (Join-Path $testArtifacts "auth-error.log")
    # Expert and gateway verify tokens with the public keys auth publishes
    $env:Jwt__JwksUrl = "http://127.0.0.1:55194/.well-known/jwks.json"
    $env:ASPNETCORE_URLS = "http://127.0.0.1:55198"
    $expertDll = Join-Path $repoRoot "BE/expert/Api/bin/Debug/net9.0/Caps.Expert.Api.dll"
    $services += Start-Process -FilePath $Dotnet -ArgumentList ('"' + $expertDll + '"') -WorkingDirectory (Join-Path $repoRoot "BE/expert/Api") @hidden -PassThru -RedirectStandardOutput (Join-Path $testArtifacts "expert.log") -RedirectStandardError (Join-Path $testArtifacts "expert-error.log")
    $env:ASPNETCORE_URLS = "http://127.0.0.1:55190"
    [Environment]::SetEnvironmentVariable("ReverseProxy__Clusters__expert-cluster__Destinations__expert__Address", "http://127.0.0.1:55198")
    [Environment]::SetEnvironmentVariable("ReverseProxy__Clusters__auth-cluster__Destinations__auth__Address", "http://127.0.0.1:55194")
    $gatewayDll = Join-Path $repoRoot "BE/gateway/bin/Debug/net9.0/gateway.dll"
    $services += Start-Process -FilePath $Dotnet -ArgumentList ('"' + $gatewayDll + '"') -WorkingDirectory (Join-Path $repoRoot "BE/gateway") @hidden -PassThru -RedirectStandardOutput (Join-Path $testArtifacts "gateway.log") -RedirectStandardError (Join-Path $testArtifacts "gateway-error.log")
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try { Invoke-WebRequest "http://127.0.0.1:55194/healthz" -UseBasicParsing | Out-Null; Invoke-WebRequest "http://127.0.0.1:55198/healthz" -UseBasicParsing | Out-Null; Invoke-WebRequest "http://127.0.0.1:55190/healthz" -UseBasicParsing | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw "Servers did not start. Inspect .tmp/auth-tests logs." }
    & $Dotnet (Join-Path $repoRoot "BE/tests/Auth.IntegrationTests/bin/Debug/net9.0/Auth.IntegrationTests.dll")
    if ($LASTEXITCODE -ne 0) { throw "Auth integration tests failed." }
} finally {
    foreach ($service in $services) { if (-not $service.HasExited) { Stop-Process -Id $service.Id -ErrorAction SilentlyContinue } }
}
