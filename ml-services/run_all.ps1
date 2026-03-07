# Green Build - Run All ML Services
# Press Ctrl+C to stop all services

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

$svcNames = @("Quantity-Takeoff", "Cost-Overrun", "Delay-Prediction", "Sustainability")
$svcDirs = @("quantity-takeoff-ml", "Cost-overrrun-Prediction-ml", "delay-prediction-ml", "sustainability-ml")
$svcPorts = @(8000, 8085, 8002, 8003)

Write-Host ""
Write-Host "  Green Build - ML Services Launcher" -ForegroundColor Cyan
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host ""

$processes = @()

for ($i = 0; $i -lt $svcNames.Count; $i++) {
    $name = $svcNames[$i]
    $dir = Join-Path $ROOT $svcDirs[$i]
    $port = $svcPorts[$i]
    $pythonExe = Join-Path $dir "venv\Scripts\python.exe"
    $runScript = Join-Path $dir "run.py"

    if (-not (Test-Path $pythonExe)) {
        Write-Host "  [SKIP] $name - venv not found at: $dir" -ForegroundColor Red
        continue
    }
    if (-not (Test-Path $runScript)) {
        Write-Host "  [SKIP] $name - run.py not found" -ForegroundColor Red
        continue
    }

    Write-Host "  [START] $name on port $port" -ForegroundColor Green

    # Use cmd /c to properly handle paths with spaces
    $proc = Start-Process -FilePath cmd.exe `
        -ArgumentList "/c", "cd /d `"$dir`" && `"$pythonExe`" `"$runScript`"" `
        -PassThru -NoNewWindow

    $processes += $proc
}

Write-Host ""
Write-Host "  All services started!" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host ""
    Write-Host "  Shutting down all services..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        if (-not $proc.HasExited) {
            # Kill the cmd process and its children (python)
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    # Also kill any remaining python processes on our ports
    Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  All services stopped." -ForegroundColor Green
}
