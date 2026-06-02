Write-Host "Iniciando SupplyAI en Windows..." -ForegroundColor Cyan

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).Path
}

Write-Host "Iniciando Backend..." -ForegroundColor Yellow
$BackendCmd = "cd /d `"$ScriptDir\backend`" && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --reload --port 8000"
Start-Process cmd -ArgumentList "/k", $BackendCmd -WindowStyle Normal

Write-Host "Iniciando Frontend..." -ForegroundColor Yellow
$FrontendCmd = "cd /d `"$ScriptDir\frontend`" && npm run dev -- --host"
Start-Process cmd -ArgumentList "/k", $FrontendCmd -WindowStyle Normal

$IPAddress = ([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.ToString() -notlike '169.254.*' -and $_.ToString() -notlike '127.*' } | Select-Object -First 1).ToString()
if (-not $IPAddress) { $IPAddress = "127.0.0.1" }

Write-Host "Servidores en linea!" -ForegroundColor Green
Write-Host "Frontend (Local): http://localhost:5173" -ForegroundColor Green
Write-Host "Frontend (Red): http://${IPAddress}:5173" -ForegroundColor Green
Write-Host "Backend: http://${IPAddress}:8000" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "Si no te carga en el celular, es porque el Firewall de Windows esta bloqueando la conexion." -ForegroundColor Yellow
Write-Host "Para solucionarlo, debes permitir las conexiones entrantes a los puertos 5173 y 8000." -ForegroundColor Yellow
