param(
  [string]$ProjectRoot = $PSScriptRoot,
  [string]$BaseUrl = ""
)

$ErrorActionPreference = 'Stop'

$failures = 0
$passes = 0

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if ($Condition) {
    Write-Host "PASS: $Message" -ForegroundColor Green
    $script:passes += 1
  } else {
    Write-Host "FAIL: $Message" -ForegroundColor Red
    $script:failures += 1
  }
}

function Resolve-ProjectPath {
  param([string]$RelativePath)
  return Join-Path $ProjectRoot $RelativePath
}

function Read-ProjectFile {
  param([string]$RelativePath)
  $path = Resolve-ProjectPath $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing file: $RelativePath"
  }
  return Get-Content -LiteralPath $path -Raw
}

Write-Host "Running Plank Tracker smoke test..." -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"
if ($BaseUrl) {
  Write-Host "HTTP checks enabled for: $BaseUrl"
} else {
  Write-Host "HTTP checks disabled (no BaseUrl provided)."
}

$requiredFiles = @(
  'index.html',
  'style.css',
  'app.js',
  'sw.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'README.md'
)

foreach ($file in $requiredFiles) {
  $exists = Test-Path -LiteralPath (Resolve-ProjectPath $file) -PathType Leaf
  Assert-True -Condition $exists -Message "Required file exists: $file"
}

$indexHtml = Read-ProjectFile 'index.html'
$appJs = Read-ProjectFile 'app.js'
$swJs = Read-ProjectFile 'sw.js'
$manifestRaw = Read-ProjectFile 'manifest.json'
$readme = Read-ProjectFile 'README.md'

Assert-True -Condition ($indexHtml -match '<meta\s+name="theme-color"') -Message 'index.html defines theme-color meta'
Assert-True -Condition ($indexHtml -match '<link\s+rel="manifest"\s+href="manifest\.json"') -Message 'index.html links manifest.json'
Assert-True -Condition ($indexHtml -match '<script\s+src="app\.js"') -Message 'index.html loads app.js'

Assert-True -Condition ($appJs -match 'function\s+updateThemeColor\(') -Message 'app.js includes dynamic theme color updater'
Assert-True -Condition ($appJs -match 'SKIP_WAITING') -Message 'app.js includes SW update message wiring'
Assert-True -Condition ($appJs -match 'promptForAppUpdate') -Message 'app.js includes update confirmation flow'

Assert-True -Condition ($swJs -match 'networkFirst') -Message 'sw.js includes network-first navigation strategy'
Assert-True -Condition ($swJs -match 'staleWhileRevalidate') -Message 'sw.js includes stale-while-revalidate strategy'
Assert-True -Condition ($swJs -match "event\.data\s*&&\s*event\.data\.type\s*===\s*'SKIP_WAITING'") -Message 'sw.js supports SKIP_WAITING message activation'

try {
  $manifest = $manifestRaw | ConvertFrom-Json
  Assert-True -Condition ($manifest.name -eq 'Plank Tracker') -Message 'manifest name is set'
  Assert-True -Condition ($manifest.id -eq '/') -Message 'manifest id is set'
  Assert-True -Condition ($manifest.lang -eq 'en') -Message 'manifest lang is set to en'
  Assert-True -Condition ($manifest.start_url -eq './') -Message 'manifest start_url is ./'
  Assert-True -Condition ($manifest.scope -eq './') -Message 'manifest scope is ./'
  Assert-True -Condition ($manifest.display -eq 'standalone') -Message 'manifest display is standalone'
  Assert-True -Condition ($manifest.icons.Count -ge 2) -Message 'manifest has at least two icons'
} catch {
  Assert-True -Condition $false -Message 'manifest.json parses as valid JSON'
}

Assert-True -Condition ($readme -match 'Release Maintenance Checklist') -Message 'README includes release maintenance checklist'

if ($BaseUrl) {
  $checkPaths = @(
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/sw.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
  )

  foreach ($path in $checkPaths) {
    try {
      $response = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $path) -Method Get -UseBasicParsing
      Assert-True -Condition ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) -Message "HTTP reachable: $path"
    } catch {
      Assert-True -Condition $false -Message "HTTP reachable: $path"
    }
  }
}

Write-Host ""
Write-Host "Smoke test summary: $passes passed, $failures failed." -ForegroundColor Yellow

if ($failures -gt 0) {
  exit 1
}

exit 0
