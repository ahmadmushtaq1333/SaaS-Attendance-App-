$base = "d:\IDB Mini Project\mobile\src"

$folders = @(
    "app",
    "assets",
    "components\ui",
    "constants",
    "hooks",
    "features\auth\api",
    "features\auth\components",
    "features\auth\screens",
    "features\auth\store",
    "features\auth\types",
    "features\attendance\api",
    "features\attendance\components",
    "features\attendance\screens",
    "features\attendance\store",
    "features\attendance\types",
    "features\dashboard\api",
    "features\dashboard\components",
    "features\dashboard\screens",
    "features\dashboard\store",
    "features\dashboard\types",
    "services\api",
    "services\storage",
    "store",
    "types",
    "utils"
)

foreach ($folder in $folders) {
    $path = Join-Path $base $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

# Create some base files to establish the pattern
Set-Content -Path (Join-Path $base "features\auth\index.ts") -Value "// Export public API for the auth feature here`n"
Set-Content -Path (Join-Path $base "features\attendance\index.ts") -Value "// Export public API for the attendance feature here`n"
Set-Content -Path (Join-Path $base "features\dashboard\index.ts") -Value "// Export public API for the dashboard feature here`n"

Write-Host "Architecture initialized successfully!"
