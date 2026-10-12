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
$env:AUTH_TEST_URL = "http://127.0.0.1:55190"
$services = @()
try {
    $env:ASPNETCORE_URLS = "http://127.0.0.1:55194"
    $authDll = Join-Path $repoRoot "BE/auth/bin/Debug/net8.0/auth.dll"
    $services += Start-Process -FilePath $Dotnet -ArgumentList ('"' + $authDll + '"') -WorkingDirectory (Join-Path $repoRoot "BE/auth") -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $testArtifacts "auth.log") -RedirectStandardError (Join-Path $testArtifacts "auth-error.log")
    $env:ASPNETCORE_URLS = "http://127.0.0.1:55190"
    [Environment]::SetEnvironmentVariable("ReverseProxy__Clusters__auth-cluster__Destinations__auth__Address", "http://127.0.0.1:55194")
    $gatewayDll = Join-Path $repoRoot "BE/gateway/bin/Debug/net8.0/gateway.dll"
    $services += Start-Process -FilePath $Dotnet -ArgumentList ('"' + $gatewayDll + '"') -WorkingDirectory (Join-Path $repoRoot "BE/gateway") -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $testArtifacts "gateway.log") -RedirectStandardError (Join-Path $testArtifacts "gateway-error.log")
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try { Invoke-WebRequest "http://127.0.0.1:55194/healthz" -UseBasicParsing | Out-Null; Invoke-WebRequest "http://127.0.0.1:55190/healthz" -UseBasicParsing | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw "Servers did not start. Inspect .tmp/auth-tests logs." }
    & $Dotnet (Join-Path $repoRoot "BE/tests/Auth.IntegrationTests/bin/Debug/net8.0/Auth.IntegrationTests.dll")
    if ($LASTEXITCODE -ne 0) { throw "Auth integration tests failed." }
} finally {
    foreach ($service in $services) { if (-not $service.HasExited) { Stop-Process -Id $service.Id -ErrorAction SilentlyContinue } }
}
