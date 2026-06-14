# Build MimoChat Installer
# Script để đóng gói ứng dụng thành file .exe installer

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MimoChat - Build Installer" -ForegroundColor Cyan
Write-Host "  NECTVETY Software by dxhop96@gmail.com" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Gray
    npm install
}

# Check if mimo.exe exists
if (-not (Test-Path "brain\mimo.exe")) {
    Write-Host "ERROR: brain\mimo.exe not found!" -ForegroundColor Red
    Write-Host "Please place mimo.exe in the brain/ folder." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found mimo.exe: $((Get-Item brain\mimo.exe).Length / 1MB) MB" -ForegroundColor Green

# Build frontend
Write-Host "[2/6] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# Prepare mimo.exe for bundling
Write-Host "[3/6] Preparing mimo.exe for bundling..." -ForegroundColor Yellow
$releaseDir = "src-tauri\target\release"
$bundleDir = "$releaseDir\mimochat"
$brainDir = "$bundleDir\brain"

# Create brain directory in build output
if (-not (Test-Path $brainDir)) {
    New-Item -ItemType Directory -Path $brainDir -Force | Out-Null
}

# Copy mimo.exe to build directory
Copy-Item "brain\mimo.exe" -Destination "$brainDir\mimo.exe" -Force
Write-Host "Copied mimo.exe to $brainDir" -ForegroundColor Green

# Also copy to C:\Program Files\MimoChat\brain\ for installed version
$installBrainDir = "C:\Program Files\MimoChat\brain"
if (-not (Test-Path $installBrainDir)) {
    New-Item -ItemType Directory -Path $installBrainDir -Force -ErrorAction SilentlyContinue | Out-Null
}

# Build Tauri
Write-Host "[4/6] Building Tauri application..." -ForegroundColor Yellow
Write-Host "(This may take several minutes on first run)" -ForegroundColor Gray

# Build with NSIS installer
Write-Host "[5/6] Creating installer..." -ForegroundColor Yellow
npm run tauri:installer

if ($LASTEXITCODE -eq 0) {
    # Post-build: Copy mimo.exe to installer output
    Write-Host "[6/6] Finalizing installer..." -ForegroundColor Yellow
    
    # Find the NSIS output directory
    $nsisDir = "src-tauri\target\release\bundle\nsis"
    if (Test-Path $nsisDir) {
        # Create a portable version with mimo.exe included
        $portableDir = "dist\portable"
        if (-not (Test-Path $portableDir)) {
            New-Item -ItemType Directory -Path $portableDir -Force | Out-Null
        }
        
        # Copy mimochat.exe
        $mimochatExe = "$releaseDir\mimochat.exe"
        if (Test-Path $mimochatExe) {
            Copy-Item $mimochatExe -Destination $portableDir -Force
            
            # Create brain folder and copy mimo.exe
            New-Item -ItemType Directory -Path "$portableDir\brain" -Force | Out-Null
            Copy-Item "brain\mimo.exe" -Destination "$portableDir\brain\mimo.exe" -Force
            
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  Build successful!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Installer:" -ForegroundColor Cyan
            Get-ChildItem "$nsisDir\*.exe" | ForEach-Object {
                Write-Host "  $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor White
            }
            Write-Host ""
            Write-Host "Portable version (with mimo.exe):" -ForegroundColor Cyan
            Write-Host "  $portableDir\" -ForegroundColor White
            Write-Host ""
            Write-Host "To install, run the NSIS installer." -ForegroundColor Yellow
            Write-Host "For portable: Copy the 'portable' folder anywhere." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
