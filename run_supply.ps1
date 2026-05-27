Write-Host "Iniciando SupplyAI en Windows..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

Write-Host "Iniciando Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd '$ScriptDir\backend'; .\venv\Scripts\activate.ps1; uvicorn app.main:app --reload --port 8000" -WindowStyle Normal

Write-Host "Iniciando Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Servidores en línea!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
