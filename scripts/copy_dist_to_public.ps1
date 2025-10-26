$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')
$FrontendDist = Join-Path $RepoRoot 'frontend/dist'
$LaravelPublic = Join-Path $RepoRoot 'backend/public'

if (-not (Test-Path $FrontendDist)) {
    Write-Error "dist folder not found. Run npm run build:prod first."
}

if (-not (Test-Path $LaravelPublic)) {
    Write-Error "Laravel public directory not found at $LaravelPublic"
}

Write-Host "Cleaning existing public assets (excluding index.php, .htaccess, uploads, api)..."
Get-ChildItem $LaravelPublic | ForEach-Object {
    $name = $_.Name
    if ($name -in @('index.php', '.htaccess', 'uploads')) { return }
    if ($name -eq 'api') { return }
    if ($_.PsIsContainer) {
        Remove-Item $_.FullName -Recurse -Force
    } else {
        Remove-Item $_.FullName -Force
    }
}

if (-not (Test-Path (Join-Path $LaravelPublic 'uploads'))) {
    New-Item -Path (Join-Path $LaravelPublic 'uploads') -ItemType Directory | Out-Null
}

Write-Host "Copying dist assets to public..."
Copy-Item -Path (Join-Path $FrontendDist '*') -Destination $LaravelPublic -Recurse -Force

Write-Host "Copy completed."
