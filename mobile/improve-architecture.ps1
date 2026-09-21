$base = "d:\IDB Mini Project\mobile\src"

# Define the new Strict FSD directories
$folders = @(
    "app\providers",
    "app\navigation",
    "screens\auth",
    "screens\dashboard",
    "screens\attendance",
    "widgets",
    "features\auth-by-email",
    "features\mark-attendance",
    "entities\user\model",
    "entities\user\api",
    "entities\user\ui",
    "entities\session\model",
    "entities\session\api",
    "entities\session\ui",
    "shared\api",
    "shared\assets",
    "shared\config",
    "shared\constants",
    "shared\lib",
    "shared\ui"
)

foreach ($folder in $folders) {
    $path = Join-Path $base $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

# Move any existing shared folders into the new shared layer
$oldShared = @("assets", "components", "constants", "hooks", "services", "store", "types", "utils")
foreach ($old in $oldShared) {
    $oldPath = Join-Path $base $old
    if (Test-Path $oldPath) {
        if ($old -eq "components") {
            # Move contents to shared/ui if possible, or just rename
            Move-Item -Path "$oldPath\*" -Destination (Join-Path $base "shared\ui") -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $oldPath -Recurse -Force
        } elseif ($old -eq "utils") {
            Move-Item -Path "$oldPath\*" -Destination (Join-Path $base "shared\lib") -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $oldPath -Recurse -Force
        } else {
            Move-Item -Path "$oldPath\*" -Destination (Join-Path $base "shared\$old") -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $oldPath -Recurse -Force
        }
    }
}

# Clean up old feature structure (we are shifting to strict FSD features + entities)
if (Test-Path (Join-Path $base "features\auth")) { Remove-Item -Path (Join-Path $base "features\auth") -Recurse -Force }
if (Test-Path (Join-Path $base "features\attendance")) { Remove-Item -Path (Join-Path $base "features\attendance") -Recurse -Force }
if (Test-Path (Join-Path $base "features\dashboard")) { Remove-Item -Path (Join-Path $base "features\dashboard") -Recurse -Force }

# Create some base files to establish the pattern
Set-Content -Path (Join-Path $base "entities\user\index.ts") -Value "// Public API for the User entity`n"
Set-Content -Path (Join-Path $base "shared\api\index.ts") -Value "// Base API client setup (Axios)`n"
Set-Content -Path (Join-Path $base "shared\ui\index.ts") -Value "// Export reusable UI components`n"

Write-Host "Architecture upgraded to Strict Feature-Sliced Design!"
