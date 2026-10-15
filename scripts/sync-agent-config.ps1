# Keeps the AI agent configuration in step across Claude Code, Codex and Antigravity.
#
# .agents/skills is the single source of skills (Codex and Antigravity read it directly).
# Claude Code reads .claude/skills, so this script copies the skills there and rewrites the
# ".agents/skills" paths written inside them to ".claude/skills".
# Subagents exist in two formats (.claude/agents/*.md, .codex/agents/*.toml); the script checks that
# both define the same agents.
#
# Usage (from the repository root):
#   ./scripts/sync-agent-config.ps1          # regenerate .claude/skills
#   ./scripts/sync-agent-config.ps1 -Check   # fail when .claude/skills or the subagents are out of step (CI)
param([switch]$Check)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Join-Path $root ".agents/skills"
$target = Join-Path $root ".claude/skills"
$utf8 = New-Object System.Text.UTF8Encoding($false)

# Byte-compiled caches are machine-specific and never part of a skill
function Test-Skipped([string]$relative) {
    return $relative -match '(^|[\\/])__pycache__([\\/]|$)' -or $relative -like "*.pyc"
}

function Test-Binary([byte[]]$bytes) {
    $length = [Math]::Min($bytes.Length, 8000)
    for ($i = 0; $i -lt $length; $i++) {
        if ($bytes[$i] -eq 0) { return $true }
    }
    return $false
}

# The Claude copy of one source file: text files get their skill paths rewritten, binaries are copied as is
function Get-ClaudeCopy([string]$path) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    if (Test-Binary $bytes) { return $bytes }
    $text = $utf8.GetString($bytes).Replace(".agents/skills", ".claude/skills")
    return $utf8.GetBytes($text)
}

# Line endings depend on git's checkout settings, so they are ignored when comparing text
function Get-Comparable([byte[]]$bytes) {
    if (Test-Binary $bytes) { return [Convert]::ToBase64String($bytes) }
    return $utf8.GetString($bytes).Replace("`r`n", "`n")
}

function Get-Files([string]$dir) {
    if (-not (Test-Path $dir)) { return @{} }
    $files = @{}
    Get-ChildItem $dir -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($dir.Length + 1).Replace("\", "/")
        if (-not (Test-Skipped $relative)) { $files[$relative] = $_.FullName }
    }
    return $files
}

function Get-AgentNames([string]$dir, [string]$filter, [string]$pattern) {
    if (-not (Test-Path $dir)) { return @() }
    return @(Get-ChildItem $dir -Filter $filter -File | ForEach-Object {
        $match = Select-String -Path $_.FullName -Pattern $pattern | Select-Object -First 1
        if ($match) { $match.Matches[0].Groups[1].Value.Trim().Trim('"') } else { "<no name: $($_.Name)>" }
    } | Sort-Object)
}

$problems = New-Object System.Collections.Generic.List[string]
$sourceFiles = Get-Files $source

if ($Check) {
    $targetFiles = Get-Files $target
    foreach ($relative in $sourceFiles.Keys) {
        if (-not $targetFiles.ContainsKey($relative)) {
            $problems.Add("missing in .claude/skills: $relative")
            continue
        }
        $expected = Get-Comparable (Get-ClaudeCopy $sourceFiles[$relative])
        $actual = Get-Comparable ([System.IO.File]::ReadAllBytes($targetFiles[$relative]))
        if ($expected -ne $actual) { $problems.Add("differs from .agents/skills: .claude/skills/$relative") }
    }
    foreach ($relative in $targetFiles.Keys) {
        if (-not $sourceFiles.ContainsKey($relative)) { $problems.Add("not in .agents/skills: .claude/skills/$relative") }
    }
} else {
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    foreach ($relative in $sourceFiles.Keys) {
        $destination = Join-Path $target $relative
        New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
        [System.IO.File]::WriteAllBytes($destination, (Get-ClaudeCopy $sourceFiles[$relative]))
    }
    Write-Host "Copied $($sourceFiles.Count) files from .agents/skills to .claude/skills."
}

# Subagents cannot be generated from one another (different formats), so only their names are compared
$claudeAgents = Get-AgentNames (Join-Path $root ".claude/agents") "*.md" '^name:\s*(.+)$'
$codexAgents = Get-AgentNames (Join-Path $root ".codex/agents") "*.toml" '^name\s*=\s*(.+)$'
foreach ($name in $claudeAgents | Where-Object { $codexAgents -notcontains $_ }) {
    $problems.Add("subagent only in .claude/agents: $name")
}
foreach ($name in $codexAgents | Where-Object { $claudeAgents -notcontains $_ }) {
    $problems.Add("subagent only in .codex/agents: $name")
}

if ($problems.Count -gt 0) {
    $problems | ForEach-Object { Write-Host "  $_" }
    if ($Check) {
        Write-Host "Agent config is out of step. Edit .agents/skills, then run ./scripts/sync-agent-config.ps1."
    }
    exit 1
}
if ($Check) { Write-Host "Agent config is in step: $($sourceFiles.Count) skill files, $($claudeAgents.Count) subagents." }
exit 0
